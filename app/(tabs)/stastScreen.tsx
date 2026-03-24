import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-chart-kit';
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
  
  const [evoSolde, setEvoSolde] = useState<any>(null);
  const [evoFlux, setEvoFlux] = useState<any>(null);
  const [evoCatSorties, setEvoCatSorties] = useState<any>(null);
  const [evoCatEntrees, setEvoCatEntrees] = useState<any>(null);
  const [evoCumul, setEvoCumul] = useState<any>(null);

  const [totals, setTotals] = useState({ entrees: 0, sorties: 0 });

  const baseColorsSorties = ['#e74c3c', '#e67e22', '#f1c40f', '#9b59b6', '#34495e'];
  const baseColorsEntrees = ['#2ecc71', '#1abc9c', '#3498db', '#27ae60', '#2980b9'];

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
    const filterPeriod = viewMode === 'mensuel' ? `${year}-${month}%` : `${year}-%`;

    try {
      // --- 1. LOGIQUE CAMEMBERTS ---
      const queryPie = `
        SELECT m.type, c.nom as cat_name, sc.nom as sub_name, SUM(m.valeur_previsionnelle) as total
        FROM mouvements m
        LEFT JOIN categories c ON m.categorie_id = c.id
        LEFT JOIN sous_categories sc ON m.sous_categorie_id = sc.id
        WHERE m.date LIKE ?
        GROUP BY m.type, c.nom, sc.nom
        ORDER BY total DESC
      `;
      const pieResults = await db.getAllAsync(queryPie, [filterPeriod]) as any[];

      let tE = 0; let tS = 0;
      const rawS: any[] = []; const rawE: any[] = [];
      pieResults.forEach(item => {
        if (item.type === 'Sortie') { tS += item.total; rawS.push(item); }
        else { tE += item.total; rawE.push(item); }
      });

      const processPie = (items: any[], palette: string[]) => {
        const groups: { [key: string]: any[] } = {};
        items.forEach(it => {
          const cat = it.cat_name || "Sans catégorie";
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(it);
        });
        const final: StatData[] = [];
        Object.keys(groups).forEach((cat, cIdx) => {
          const base = palette[cIdx % palette.length];
          groups[cat].forEach((it, sIdx) => {
            final.push({
              name: it.sub_name ? `${cat} (${it.sub_name})` : cat,
              population: it.total,
              color: generateGradient(base, sIdx, groups[cat].length),
              legendFontColor: "#7F7F7F", legendFontSize: 10
            });
          });
        });
        return final;
      };

      setDataSorties(processPie(rawS, baseColorsSorties));
      setDataEntrees(processPie(rawE, baseColorsEntrees));
      setDataComparaison([
        { name: "Entrées", population: tE || 0.1, color: '#2ecc71', legendFontColor: "#7F7F7F", legendFontSize: 12 },
        { name: "Sorties", population: tS || 0.1, color: '#e74c3c', legendFontColor: "#7F7F7F", legendFontSize: 12 }
      ]);
      setTotals({ entrees: tE, sorties: tS });

      // --- 2. LOGIQUE COURBES ---
      let labels: string[] = [];
      let sqlFormat = viewMode === 'mensuel' ? "%d" : "%m";
      let filterEvo = viewMode === 'mensuel' ? `${year}-${month}%` : `${year}-%`;
      let dataSize = viewMode === 'mensuel' ? 31 : 12;

      const queryLine = `
        SELECT strftime('${sqlFormat}', date) as point, type, c.nom as cat_name, SUM(valeur_previsionnelle) as total
        FROM mouvements m
        LEFT JOIN categories c ON m.categorie_id = c.id
        WHERE date LIKE ?
        GROUP BY point, type, cat_name
        ORDER BY point ASC
      `;
      const lineResults = await db.getAllAsync(queryLine, [filterEvo]) as any[];

      const sData = new Array(dataSize).fill(0);
      const eData = new Array(dataSize).fill(0);
      const catSMap: any = {};
      const catEMap: any = {};

      lineResults.forEach(r => {
        const idx = parseInt(r.point) - 1;
        if (idx >= 0 && idx < dataSize) {
          if (r.type === 'Entrée') {
            eData[idx] += r.total;
            if (!catEMap[r.cat_name]) catEMap[r.cat_name] = new Array(dataSize).fill(0);
            catEMap[r.cat_name][idx] = r.total;
          } else {
            sData[idx] += r.total;
            if (!catSMap[r.cat_name]) catSMap[r.cat_name] = new Array(dataSize).fill(0);
            catSMap[r.cat_name][idx] = r.total;
          }
        }
      });

      // Optimisation de l'affichage pour le mode mensuel (on regroupe par tranches de 3 jours pour éviter l'effet "bas")
      const finalLabels = viewMode === 'mensuel' ? ["1", "5", "10", "15", "20", "25", "30"] : ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
      
      const prepareData = (arr: number[]) => {
        if (viewMode === 'annuel') return arr;
        // En mensuel, on crée des "paliers" pour que la courbe ne retombe pas à zéro violemment
        const condensed = [];
        for(let i=0; i<30; i+=4) {
          const chunk = arr.slice(i, i+4);
          condensed.push(chunk.reduce((a,b) => a+b, 0));
        }
        return condensed;
      };

      const fE = prepareData(eData);
      const fS = prepareData(sData);

      setEvoFlux({ labels: finalLabels, datasets: [{ data: fE, color: () => '#2ecc71' }, { data: fS, color: () => '#e74c3c' }], legend: ["In", "Out"] });
      setEvoSolde({ labels: finalLabels, datasets: [{ data: fE.map((v, i) => v - fS[i]), color: () => '#3498db' }] });

      let currentCumul = 0;
      const cData = eData.map((v, i) => currentCumul += (v - sData[i]));
      setEvoCumul({ labels: finalLabels, datasets: [{ data: prepareData(cData), color: () => '#f1c40f' }] });

      const getTop = (map: any, pal: string[]) => {
        const keys = Object.keys(map);
        if (keys.length === 0) return null; // Sécurité si pas de données

        const top = keys
          .sort((a, b) => map[b].reduce((x: any, y: any) => x + y, 0) - map[a].reduce((x: any, y: any) => x + y, 0))
          .slice(0, 3);

        return {
          labels: finalLabels,
          datasets: top.map((name, i) => ({
            data: prepareData(map[name]),
            color: () => pal[i % pal.length]
          })),
          legend: top
        };
      };
      setEvoCatSorties(getTop(catSMap, baseColorsSorties));
      setEvoCatEntrees(getTop(catEMap, baseColorsEntrees));

    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, [currentDate, viewMode]));

  const chartConfig = {
    backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
    decimalPlaces: 0, color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    labelColor: () => `#7f8c8d`, style: { borderRadius: 16 }, propsForDots: { r: "3" }
  };
  const isValidLineData = (chartData: any) => {
    return chartData && 
          chartData.datasets && 
          chartData.datasets.length > 0 && 
          chartData.datasets[0].data && 
          chartData.datasets[0].data.length > 0;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'mensuel' ? 'annuel' : 'mensuel')} style={styles.modeToggle}>
          <Text style={styles.modeToggleText}>{viewMode === 'mensuel' ? 'VUE MENSUELLE' : 'VUE ANNUELLE'}</Text>
        </TouchableOpacity>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => {
            const d = new Date(currentDate);
            viewMode === 'mensuel' ? d.setMonth(d.getMonth()-1) : d.setFullYear(d.getFullYear()-1);
            setCurrentDate(d);
          }}><Text style={styles.navArrow}>◀</Text></TouchableOpacity>
          <Text style={styles.currentDateText}>
            {viewMode === 'mensuel' ? currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => {
            const d = new Date(currentDate);
            viewMode === 'mensuel' ? d.setMonth(d.getMonth()+1) : d.setFullYear(d.getFullYear()+1);
            setCurrentDate(d);
          }}><Text style={styles.navArrow}>▶</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <Text style={styles.sectionHeader}>Répartitions</Text>
        <View style={styles.cardWhite}>
          <Text style={styles.chartTitle}>Balance Entrées/Sorties</Text>
          <PieChart data={dataComparaison} width={screenWidth - 40} height={180} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
          <View style={styles.dividerInner} />
          <Text style={styles.chartTitle}>Détail Sorties</Text>
          <PieChart data={dataSorties} width={screenWidth - 40} height={200} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
          <View style={styles.dividerInner} />
          <Text style={styles.chartTitle}>Détail Entrées</Text>
          <PieChart data={dataEntrees} width={screenWidth - 40} height={200} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
        </View>

        <Text style={styles.sectionHeader}>Tendances</Text>

        <View style={styles.cardWhite}>
          <Text style={styles.chartTitle}>Flux In vs Out</Text>
          {isValidLineData(evoFlux) ? (
            <LineChart data={evoFlux} width={screenWidth - 60} height={180} chartConfig={chartConfig} bezier style={styles.br15} />
          ) : (
            <Text style={{color: '#bdc3c7', padding: 20}}>Aucune donnée de flux</Text>
          )}
        </View>

        <View style={styles.cardWhite}>
          <Text style={styles.chartTitle}>Evolution du Solde</Text>
          {isValidLineData(evoSolde) ? (
            <LineChart data={evoSolde} width={screenWidth - 60} height={180} chartConfig={chartConfig} bezier style={styles.br15} />
          ) : (
            <Text style={{color: '#bdc3c7', padding: 20}}>Aucune donnée de solde</Text>
          )}
        </View>

        <View style={styles.cardWhite}>
          <Text style={styles.chartTitle}>Cumul d&apos;Épargne</Text>
          {isValidLineData(evoCumul) ? (
            <LineChart data={evoCumul} width={screenWidth - 60} height={180} chartConfig={chartConfig} bezier style={styles.br15} />
          ) : (
            <Text style={{color: '#bdc3c7', padding: 20}}>Aucune donnée de cumul</Text>
          )}
        </View>

        <View style={styles.cardWhite}>
          <Text style={styles.chartTitle}>Top 3 Dépenses</Text>
          {isValidLineData(evoCatSorties) ? (
            <LineChart data={evoCatSorties} width={screenWidth - 60} height={180} chartConfig={chartConfig} bezier style={styles.br15} />
          ) : (
            <Text style={{color: '#bdc3c7', padding: 20}}>Aucune dépense catégorisée</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  headerNav: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 },
  modeToggle: { backgroundColor: '#ebf5fb', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#3498db' },
  modeToggleText: { color: '#3498db', fontSize: 10, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  currentDateText: { fontSize: 14, fontWeight: 'bold', marginHorizontal: 10, textTransform: 'capitalize' },
  navArrow: { fontSize: 18, color: '#3498db', padding: 5 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', margin: 20, marginBottom: 10 },
  cardWhite: { backgroundColor: '#fff', marginHorizontal: 15, marginVertical: 8, padding: 15, borderRadius: 20, elevation: 3, alignItems: 'center' },
  chartTitle: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 10 },
  dividerInner: { height: 1, backgroundColor: '#f1f2f6', width: '80%', marginVertical: 15 },
  br15: { borderRadius: 15 }
});