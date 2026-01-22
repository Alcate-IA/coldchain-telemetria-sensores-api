import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import XLSX from 'xlsx'; // <--- NOVA IMPORTAÇÃO (SheetJS)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// --- MIDDLEWARES GERAIS ---
app.use(cors());
app.use(express.json());

// --- MIDDLEWARE DE SEGURANÇA (API KEY) ---
const authMiddleware = (req, res, next) => {
    const userApiKey = req.header('x-api-key');
    const masterApiKey = process.env.API_KEY;

    if (!userApiKey || userApiKey !== masterApiKey) {
        return res.status(401).json({ 
            error: 'Acesso não autorizado. API Key inválida ou ausente.' 
        });
    }
    next();
};

app.use('/api', authMiddleware);


// ==================================================================
// ROTAS DE DISPOSITIVOS
// ==================================================================

app.get('/api/dispositivos', async (req, res) => {
    try {
        const { data: logs, error: logError } = await supabase.from('telemetry_logs').select('gw, mac');
        const { data: configs, error: configError } = await supabase.from('sensor_configs').select('*');

        if (logError) throw logError;

        const configMap = new Map(configs?.map(c => [c.mac, c]) || []);

        const dispositivosUnicos = logs.reduce((acc, current) => {
            const idUnico = `${current.gw}-${current.mac}`;
            if (!acc.mapa.has(idUnico)) {
                acc.mapa.add(idUnico);
                const config = configMap.get(current.mac) || {};
                acc.lista.push({ 
                    gw: current.gw, 
                    mac: current.mac,
                    display_name: config.display_name || 'Novo Sensor',
                    batt_warning: config.batt_warning || 20,
                    max_temp: config.temp_max || 0,
                    max_hum: config.hum_max || 0,
                    em_manutencao: !!config.em_manutencao
                });
            }
            return acc;
        }, { mapa: new Set(), lista: [] }).lista;

        return res.status(200).json(dispositivosUnicos);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.patch('/api/dispositivos', async (req, res) => {
    try {
        // 1. Recebe o novo campo do corpo da requisição
        const { 
            mac, 
            display_name, 
            batt_warning, 
            temp_max, 
            hum_max, 
            max_temp, 
            max_hum, 
            sensor_porta_vinculado,
            em_manutencao
        } = req.body;

        if (!mac) return res.status(400).json({ error: 'MAC Obrigatório' });

        const payload = {
            mac: mac,
            display_name: display_name,
            batt_warning: Number(batt_warning || 20),
            temp_max: Number(temp_max !== undefined ? temp_max : (max_temp || null)),
            hum_max: Number(hum_max !== undefined ? hum_max : (max_hum || null)),
            sensor_porta_vinculado: sensor_porta_vinculado || null, 
            em_manutencao: em_manutencao !== undefined ? em_manutencao : false,
            
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('sensor_configs')
            .upsert(payload, { onConflict: 'mac' })
            .select();

        if (error) throw error;
        return res.status(200).json({ message: 'Configuração salva!', data: data[0] });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// ==================================================================
// ROTAS DE TELEMETRIA
// ==================================================================

app.get('/api/sensores/latest', async (req, res) => {
    try {
        // 1. Busca logs da VIEW OTIMIZADA (Agora é rápido e não traz histórico inútil)
        const { data: logs, error: logError } = await supabase
            .from('view_latest_telemetry') 
            .select('*');

        // 2. Busca Configurações
        const { data: configs, error: configError } = await supabase
            .from('sensor_configs')
            .select('mac, display_name, sensor_porta_vinculado, em_manutencao');

        // 3. Busca status das portas (View otimizada)
        const { data: doorLogs, error: doorError } = await supabase
            .from('view_latest_door_status')
            .select('*');

        if (logError) throw logError;
        if (configError) throw configError;
        if (doorError) throw doorError;

        // --- MAPAS DE BUSCA RÁPIDA ---
        const configMap = new Map(configs?.map(c => [c.mac, c]) || []);
        
        // Mapa usando 'sensor_mac' como chave
        const doorMap = new Map(doorLogs?.map(d => [d.sensor_mac, d]) || []);

        // --- PROCESSAMENTO (Agora é apenas um map simples, sem reduce pesado) ---
        const result = logs.map(item => {
            const config = configMap.get(item.mac) || {};
            const macPortaVinculada = config.sensor_porta_vinculado;
            
            let dadosPorta = null;

            // Lógica de Vinculação
            if (macPortaVinculada) {
                const statusPorta = doorMap.get(macPortaVinculada);
                if (statusPorta) {
                    dadosPorta = {
                        is_open: statusPorta.is_open
                    };
                }
            }

            return {
                ...item,
                display_name: config.display_name || 'Sensor Sem Nome',
                sensor_porta_vinculado: macPortaVinculada || null,
                status_porta: dadosPorta,
                em_manutencao: !!config.em_manutencao
            };
        });

        // Ordenação alfabética
        result.sort((a, b) => a.display_name.localeCompare(b.display_name));
        
        return res.status(200).json(result);

    } catch (error) {
        console.error("Erro na API Latest:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sensor/report
 * Retorna um arquivo EXCEL (.xlsx) pronto para download.
 */
app.get('/api/sensor/report', async (req, res) => {
    try {
        const { mac, startDate, endDate } = req.query;

        if (!mac || !startDate || !endDate) {
            return res.status(400).json({ error: 'Faltam parâmetros: mac, startDate, endDate' });
        }

        // 1. Busca Dados no Banco
        const { data, error } = await supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac)
            .gte('ts', startDate)
            .lte('ts', endDate)
            .order('ts', { ascending: true }); // Cronológico

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Nenhum dado encontrado para este período.' });
        }

        // 2. Formata os dados para o Excel (Renomeia colunas)
        const excelData = data.map(item => ({
            "Data/Hora": new Date(item.ts).toLocaleString('pt-BR'), // Formata data bonita
            "Temperatura (°C)": item.temp,
            "Umidade (%)": item.hum,
            "Bateria (%)": item.batt,
            "Gateway": item.gw,
            "RSSI (dBm)": item.rssi,
            "Sensor MAC": item.mac
        }));

        // 3. Cria a Planilha (WorkSheet) e o Livro (WorkBook)
        const workSheet = XLSX.utils.json_to_sheet(excelData);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Relatorio");

        // 4. Gera o Buffer binário do arquivo
        const buffer = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });

        // 5. Define headers para Download do Excel
        const filename = `relatorio_${mac.replace(/:/g, '')}_${Date.now()}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // 6. Envia o buffer
        return res.send(buffer);

    } catch (error) {
        console.error('Erro no report excel:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sensor/coordinates
 * Retorna coordenadas (lat, lng, alt) de um sensor.
 * - Com startDate/endDate: Retorna histórico (caminho percorido).
 * - Sem datas: Retorna apenas a ÚLTIMA posição conhecida.
 */
app.get('/api/sensor/coordinates', async (req, res) => {
    try {
        const { mac, startDate, endDate } = req.query;

        // 1. Validação: Apenas MAC é estritamente obrigatório agora
        if (!mac) {
            return res.status(400).json({ error: 'O parâmetro "mac" é obrigatório.' });
        }

        // Inicia a query base
        let query = supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac);

        // 2. Decide a estratégia de busca
        if (startDate && endDate) {
            // MODO HISTÓRICO: Busca intervalo e ordena do mais antigo para o novo (caminho)
            query = query
                .gte('ts', startDate)
                .lte('ts', endDate)
                .order('ts', { ascending: true });
        } else {
            // MODO ÚLTIMA POSIÇÃO: Busca apenas o registro mais recente
            query = query
                .order('ts', { ascending: false })
                .limit(1);
        }

        const { data, error } = await query;

        if (error) throw error;

        // 3. Formata os dados
        const coordinates = (data || [])
            .map(item => ({
                ts: item.ts,
                lat: item.latitude ?? item.lat, // Suporte a campos legados
                lng: item.longitude ?? item.lng,
                alt: item.altitude ?? 0
            }))
            // Filtra logs que não possuem coordenadas (evita pontos nulos no mapa)
            .filter(c => c.lat != null && c.lng != null);

        return res.status(200).json(coordinates);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/sensores/:mac', async (req, res) => {
    try {
        const { mac } = req.params;
        const { period = '24h', limit } = req.query;

        // 1. Busca os logs (Histórico)
        // O select('*') já traz latitude, longitude e altitude se existirem na tabela
        let logsQuery = supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac)
            .order('ts', { ascending: false });

        // Filtro de período
        if (period !== 'all') {
            const agora = new Date();
            let dataInicio;
            if (period === '1h') dataInicio = new Date(agora.getTime() - 3600000);
            else if (period === '24h') dataInicio = new Date(agora.getTime() - 86400000);
            else if (period === '7d') dataInicio = new Date(agora.getTime() - 604800000);
            
            if (dataInicio) logsQuery = logsQuery.gte('ts', dataInicio.toISOString());
        }

        if (limit) logsQuery = logsQuery.limit(parseInt(limit));

        // 2. Busca as configurações do sensor
        const configQuery = supabase.from('sensor_configs').select('*').eq('mac', mac).maybeSingle();

        // Executa em paralelo
        const [logsResult, configResult] = await Promise.all([logsQuery, configQuery]);

        if (logsResult.error) throw logsResult.error;
        if (configResult.error) throw configResult.error;

        const rawLogs = logsResult.data || [];
        
        // 3. Processamento de Downsampling (Opcional: mantém lógica de 10 min)
        const filteredLogs = [];
        let lastKeptTime = 0;
        const TEN_MINUTES_MS = 10 * 60 * 1000;

        for (const log of rawLogs) {
            const logTime = new Date(log.ts).getTime();
            // Mantém o primeiro log (mais recente) e depois aplica o intervalo
            if (filteredLogs.length === 0 || Math.abs(lastKeptTime - logTime) >= TEN_MINUTES_MS) {
                filteredLogs.push(log);
                lastKeptTime = logTime;
            }
        }

        // 4. Monta o objeto INFO
        let sensorInfo = configResult.data || {
            mac: mac,
            display_name: 'Sensor Não Configurado',
            batt_warning: 20,
            temp_max: 0,
            hum_max: 0,
            em_manutencao: false
        };

        // --- ATUALIZAÇÃO IMPORTANTE ---
        // Pegamos a latitude/longitude/altitude do log MAIS RECENTE (rawLogs[0])
        // e injetamos no objeto 'info' para facilitar o uso no mapa.
        if (rawLogs.length > 0) {
            const latest = rawLogs[0];
            sensorInfo = {
                ...sensorInfo,
                latitude: latest.latitude ?? latest.lat,   // Tenta 'latitude', fallback para 'lat'
                longitude: latest.longitude ?? latest.lng, // Tenta 'longitude', fallback para 'lng'
                altitude: latest.altitude ?? 0
            };
        }

        return res.status(200).json({ info: sensorInfo, history: filteredLogs });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ==================================================================
// ROTAS DE PORTAS (DOOR LOGS)
// ==================================================================

app.get('/api/doors/latest', async (req, res) => {
    try {
        // 1. Busca os últimos registros direto da View Otimizada
        const { data: logs, error: logError } = await supabase
            .from('view_latest_door_status')
            .select('*');

        if (logError) throw logError;

        // 2. Opcional: Busca configurações extras se houver (ex: bateria minima)
        // Ajustado para usar 'sensor_mac' e não buscar 'display_name'
        const { data: configs, error: configError } = await supabase
            .from('sensor_configs')
            .select('sensor_mac'); 
            // Adicione outros campos aqui se existirem, ex: 'batt_warning'

        // Cria um Set de MACs configurados para saber se o sensor é conhecido
        const macsConfigurados = new Set(configs?.map(c => c.sensor_mac) || []);

        // 3. Monta o objeto final
        const result = logs.map(log => {
            const isKnown = macsConfigurados.has(log.sensor_mac);

            return {
                ...log,
                // Como não existe display_name, usamos o MAC formatado
                display_name: `Porta ${log.sensor_mac}`, 
                status_text: log.is_open ? 'ABERTO' : 'FECHADO',
                status_color: log.is_open ? 'red' : 'green',
                is_configured: isKnown // Flag útil para o frontend saber se é um sensor "novo"
            };
        });

        // Ordena pelo MAC para manter a lista estável
        result.sort((a, b) => a.sensor_mac.localeCompare(b.sensor_mac));

        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Rodando em http://localhost:${PORT}`);
});