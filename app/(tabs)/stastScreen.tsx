import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import db from '../../database';

const screenWidth = Dimensions.get("window").width;

interface StatData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export default function StatsScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'mensuel' | 'annuel'>('mensuel');
  
  const [dataComparaison, setDataComparaison] = useState<StatData[]>([]);
  const [dataSorties, setDataSorties] = useState<StatData[]>([]);
  const [dataEntrees, setDataEntrees] = useState<StatData[]>([]);
  const [totals, setTotals] = useState({ entrees: 0, sorties: 0 });

  // Base de couleurs pour les catégories parentes
  const baseColorsSorties = ['#e74c3c', '#e67e22', '#f1c40f', '#9b59b6', '#34495e'];
  const baseColorsEntrees = ['#2ecc71', '#1abc9c', '#3498db', '#27ae60', '#2980b9'];

  // Fonction pour générer un dégradé (opacité variable)
  const generateGradient = (baseColor: string, index: number, totalInCat: number) => {
    const opacity = 1 - (index / (totalInCat + 1)) * 0.6; 
    if (baseColor.startsWith('#')) {
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return baseColor;
  };

  const loadStats = async () => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const filter = viewMode === 'mensuel' ? `${year}-${month}%` : `${year}-%`;

    // Requête modifiée pour grouper par Catégorie ET Sous-Catégorie
    const query = `
      SELECT 
        m.type, 
        c.nom as cat_name, 
        sc.nom as sub_name, 
        SUM(m.valeur_previsionnelle) as total
      FROM mouvements m
      LEFT JOIN categories c ON m.categorie_id = c.id
      LEFT JOIN sous_categories sc ON m.sous_categorie_id = sc.id
      WHERE m.date LIKE ?
      GROUP BY m.type, c.nom, sc.nom
      ORDER BY c.nom ASC, total DESC
    `;

    try {
      const results = await db.getAllAsync(query, [filter]) as any[];
      
      let totalE = 0; let totalS = 0;
      const rawS: any[] = []; const rawE: any[] = [];

      results.forEach(item => {
        if (item.type === 'Sortie') { totalS += item.total; rawS.push(item); }
        else { totalE += item.total; rawE.push(item); }
      });

      const processData = (rawItems: any[], colorPalette: string[]) => {
        const finalData: StatData[] = [];
        const groups: { [key: string]: any[] } = {};
        
        // Grouper par catégorie parente
        rawItems.forEach(item => {
          const cat = item.cat_name || "Sans catégorie";
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
        });

        // Appliquer les dégradés
        Object.keys(groups).forEach((cat, catIdx) => {
          const baseCol = colorPalette[catIdx % colorPalette.length];
          groups[cat].forEach((item, subIdx) => {
            finalData.push({
              name: item.sub_name ? `${cat} (${item.sub_name})` : cat,
              population: item.total,
              color: generateGradient(baseCol, subIdx, groups[cat].length),
              legendFontColor: "#7F7F7F",
              legendFontSize: 10,
            });
          });
        });
        return finalData;
      };

      setDataSorties(processData(rawS, baseColorsSorties));
      setDataEntrees(processData(rawE, baseColorsEntrees));
      setDataComparaison([
        { name: "Entrées", population: totalE, color: '#2ecc71', legendFontColor: "#7F7F7F", legendFontSize: 12 },
        { name: "Sorties", population: totalS, color: '#e74c3c', legendFontColor: "#7F7F7F", legendFontSize: 12 }
      ]);
      setTotals({ entrees: totalE, sorties: totalS });

    } catch (error) {
      console.error("Erreur Stats:", error);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, [currentDate, viewMode]));

  const changeDate = (direction: 'next' | 'prev') => {
    const newDate = new Date(currentDate);
    viewMode === 'mensuel' ? newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1)) : newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const renderChart = (title: string, data: StatData[], total: number, color: string) => (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={[styles.totalText, { color }]}>{total.toFixed(2)} €</Text>
      {data.length > 0 ? (
        <PieChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
      ) : <Text style={styles.noData}>Aucune donnée 🤷‍♂️</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'mensuel' ? 'annuel' : 'mensuel')} style={styles.modeToggle}>
          <Text style={styles.modeToggleText}>{viewMode === 'mensuel' ? 'MOIS' : 'ANNÉE'}</Text>
        </TouchableOpacity>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate('prev')}><Text style={styles.navArrow}>◀</Text></TouchableOpacity>
          <Text style={styles.currentDateText}>{viewMode === 'mensuel' ? currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}</Text>
          <TouchableOpacity onPress={() => changeDate('next')}><Text style={styles.navArrow}>▶</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderChart("Balance Globale", dataComparaison, totals.entrees - totals.sorties, (totals.entrees - totals.sorties) >= 0 ? '#2ecc71' : '#e74c3c')}
        <View style={styles.divider} /><Text style={styles.sectionHint}>Dégradés par catégorie parente</Text>
        {renderChart("Détail par Sous-Catégories (Sorties)", dataSorties, totals.sorties, '#e74c3c')}
        <View style={styles.divider} />
        {renderChart("Détail par Sous-Catégories (Entrées)", dataEntrees, totals.entrees, '#2ecc71')}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerNav: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modeToggle: { backgroundColor: '#ebf5fb', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#3498db' },
  modeToggleText: { color: '#3498db', fontSize: 10, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  currentDateText: { fontSize: 14, fontWeight: 'bold', marginHorizontal: 10, textTransform: 'capitalize' },
  navArrow: { fontSize: 18, color: '#3498db', padding: 5 },
  scrollContent: { paddingBottom: 30 },
  chartSection: { alignItems: 'center', paddingVertical: 20, width: '100%' },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  totalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  divider: { height: 8, backgroundColor: '#f1f2f6', width: '100%' },
  noData: { marginVertical: 20, color: '#bdc3c7', fontStyle: 'italic' },
  sectionHint: { textAlign: 'center', fontSize: 10, color: '#95a5a6', marginTop: 10, fontStyle: 'italic' }
});