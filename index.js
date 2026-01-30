import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

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

// ==================================================================
// MIDDLEWARE DE LOG (LOGGER)
// ==================================================================
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] 📡 REQ: ${req.method} ${req.originalUrl}`);
    if (['POST', 'PATCH'].includes(req.method)) {
        console.log(`   📦 Body:`, JSON.stringify(req.body));
    }
    next();
});

// --- MIDDLEWARE DE SEGURANÇA (API KEY) ---
const authMiddleware = (req, res, next) => {
    const userApiKey = req.header('x-api-key');
    const masterApiKey = process.env.API_KEY;

    // Se não tiver API Key configurada no .env, libera (dev mode) ou bloqueia
    if (masterApiKey && (!userApiKey || userApiKey !== masterApiKey)) {
        console.warn(`[!] Tentativa não autorizada: ${req.ip}`);
        return res.status(401).json({ 
            error: 'Acesso não autorizado. API Key inválida ou ausente.' 
        });
    }
    next();
};

app.use('/api', authMiddleware);


// ==================================================================
// ROTAS DE DISPOSITIVOS (CONFIGURAÇÕES)
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
                    batt_warning: config.batt_warning ==='' ? null : config.batt_warning,
                    max_temp: config.temp_max ==='' ? null : config.temp_max,
                    min_temp: config.temp_min ==='' ? null : config.temp_min,
                    max_hum: config.hum_max ==='' ? null : config.hum_max,
                    min_hum: config.hum_min ==='' ? null : config.hum_min,
                    sensor_porta_vinculado: config.sensor_porta_vinculado || null, 
                    em_manutencao: !!config.em_manutencao
                });
            }
            return acc;
        }, { mapa: new Set(), lista: [] }).lista;

        return res.status(200).json(dispositivosUnicos);
    } catch (error) {
        console.error('Erro em GET /dispositivos:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.patch('/api/dispositivos', async (req, res) => {
    try {
        const {
            mac, display_name, batt_warning,
            max_temp, min_temp, max_hum, min_hum,
            sensor_porta_vinculado, maintenance_mode 
        } = req.body;

        if (!mac) return res.status(400).json({ error: 'MAC Obrigatório' });

        const payload = {
            mac: mac,
            display_name: display_name ?? null,
            batt_warning: batt_warning === '' ? null : Number(batt_warning),
            temp_max: max_temp === '' ? null : Number(max_temp),
            temp_min: min_temp === '' ? null : Number(min_temp),
            hum_max: max_hum === '' ? null : Number(max_hum),
            hum_min: min_hum === '' ? null : Number(min_hum),
            sensor_porta_vinculado: sensor_porta_vinculado ?? null, 
            em_manutencao: maintenance_mode !== undefined ? maintenance_mode : false,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('sensor_configs')
            .upsert(payload, { onConflict: 'mac' })
            .select();

        if (error) throw error;
        
        console.log(`✅ Configuração atualizada para MAC: ${mac}`);
        return res.status(200).json({ message: 'Configuração salva!', data: data[0] });

    } catch (error) {
        console.error('Erro em PATCH /dispositivos:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==================================================================
// ROTAS DE TELEMETRIA (DASHBOARD)
// ==================================================================

app.get('/api/sensores/latest', async (req, res) => {
    try {
        // 1. Busca últimas leituras
        const { data: logs, error: logError } = await supabase.from('view_latest_telemetry').select('*');
        
        // 2. Busca configurações
        const { data: configs, error: configError } = await supabase.from('sensor_configs').select('mac, display_name, em_manutencao');
        
        // 3. Busca último status de porta (Unificado: sensor_mac = mac do termômetro)
        const { data: doorLogs, error: doorError } = await supabase.from('view_latest_door_status').select('*');

        if (logError) throw logError;
        if (configError) throw configError;
        if (doorError) throw doorError;

        const configMap = new Map(configs?.map(c => [c.mac, c]) || []);
        const doorMap = new Map(doorLogs?.map(d => [d.sensor_mac, d]) || []);

        const result = logs.map(item => {
            const config = configMap.get(item.mac) || {};
            
            // CORREÇÃO AQUI: Usa o MAC do próprio sensor para achar o status da porta virtual
            const statusPortaLog = doorMap.get(item.mac);
            
            let dadosPorta = null;
            if (statusPortaLog) {
                dadosPorta = {
                    // Aqui estava o erro. Agora usamos a variável correta 'statusPortaLog'
                    is_open: statusPortaLog.is_open,
                    last_change: statusPortaLog.timestamp_read 
                };
            }

            return {
                ...item, 
                display_name: config.display_name || 'Sensor Sem Nome',
                status_porta: dadosPorta, 
                em_manutencao: !!config.em_manutencao
            };
        });

        result.sort((a, b) => a.display_name.localeCompare(b.display_name));
        return res.status(200).json(result);

    } catch (error) {
        console.error("Erro na API Latest:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/sensor/report', async (req, res) => {
    try {
        const { mac, startDate, endDate } = req.query;
        console.log(`📊 Gerando relatório Excel para: ${mac}`);

        if (!mac || !startDate || !endDate) {
            return res.status(400).json({ error: 'Faltam parâmetros: mac, startDate, endDate' });
        }

        // Busca Telemetria
        const { data: telemetryData, error: telemetryError } = await supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac)
            .gte('ts', startDate)
            .lte('ts', endDate)
            .order('ts', { ascending: true });

        if (telemetryError) throw telemetryError;

        // Busca Eventos de Porta (Mesmo MAC agora)
        const { data: doorData, error: doorError } = await supabase
            .from('door_logs')
            .select('*')
            .eq('sensor_mac', mac)
            .gte('timestamp_read', startDate)
            .lte('timestamp_read', endDate)
            .order('timestamp_read', { ascending: true });

        if (!telemetryData || telemetryData.length === 0) {
            return res.status(404).json({ error: 'Nenhum dado encontrado para este período.' });
        }

        const excelData = telemetryData.map(item => ({
            "Tipo": "Leitura",
            "Data/Hora": new Date(item.ts).toLocaleString('pt-BR'),
            "Temperatura (°C)": item.temp,
            "Umidade (%)": item.hum,
            "Bateria (%)": item.batt,
            "Gateway": item.gw,
            "Sensor MAC": item.mac
        }));

        const excelDoorData = (doorData || []).map(item => ({
            "Data/Hora": new Date(item.timestamp_read).toLocaleString('pt-BR'),
            "Estado": item.is_open ? "ABERTO (Virtual)" : "FECHADO",
            "Detalhe": item.is_open ? "Subida Brusca Temp" : "Resfriamento",
            "Sensor MAC": item.sensor_mac
        }));

        const workBook = XLSX.utils.book_new();
        
        const sheetTemp = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workBook, sheetTemp, "Temperatura e Umidade");

        if (excelDoorData.length > 0) {
            const sheetDoor = XLSX.utils.json_to_sheet(excelDoorData);
            XLSX.utils.book_append_sheet(workBook, sheetDoor, "Eventos de Porta");
        }

        const buffer = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `relatorio_${mac.replace(/:/g, '')}_${Date.now()}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        console.log(`✅ Relatório enviado com sucesso.`);
        return res.send(buffer);

    } catch (error) {
        console.error('Erro no report excel:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Coordenadas (Mantido)
app.get('/api/sensor/coordinates', async (req, res) => {
    try {
        const { mac, startDate, endDate } = req.query;
        if (!mac) return res.status(400).json({ error: 'MAC Obrigatório.' });

        let query = supabase.from('telemetry_logs').select('*').eq('mac', mac);

        if (startDate && endDate) {
            query = query.gte('ts', startDate).lte('ts', endDate).order('ts', { ascending: true });
        } else {
            query = query.order('ts', { ascending: false }).limit(1);
        }

        const { data, error } = await query;
        if (error) throw error;

        const coordinates = (data || [])
            .map(item => ({
                ts: item.ts,
                lat: item.latitude ?? item.lat,
                lng: item.longitude ?? item.lng,
                alt: item.altitude ?? 0
            }))
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

        let logsQuery = supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac)
            .order('ts', { ascending: false });

        if (period !== 'all') {
            const agora = new Date();
            let dataInicio;
            if (period === '1h') dataInicio = new Date(agora.getTime() - 3600000);
            else if (period === '24h') dataInicio = new Date(agora.getTime() - 86400000);
            else if (period === '7d') dataInicio = new Date(agora.getTime() - 604800000);
            
            if (dataInicio) logsQuery = logsQuery.gte('ts', dataInicio.toISOString());
        }

        if (limit) logsQuery = logsQuery.limit(parseInt(limit));

        const configQuery = supabase.from('sensor_configs').select('*').eq('mac', mac).maybeSingle();

        const [logsResult, configResult] = await Promise.all([logsQuery, configQuery]);

        if (logsResult.error) throw logsResult.error;
        if (configResult.error) throw configResult.error;

        const rawLogs = logsResult.data || [];
        
        // Filtro de Downsampling
        const filteredLogs = [];
        let lastKeptTime = 0;
        const TEN_MINUTES_MS = 10 * 60 * 1000;

        for (const log of rawLogs) {
            const logTime = new Date(log.ts).getTime();
            if (filteredLogs.length === 0 || Math.abs(lastKeptTime - logTime) >= TEN_MINUTES_MS) {
                filteredLogs.push(log);
                lastKeptTime = logTime;
            }
        }

        let sensorInfo = configResult.data || {
            mac: mac,
            display_name: 'Sensor Não Configurado',
            batt_warning: 20, 
            temp_max: null, temp_min: null,
            hum_max: null, hum_min: null,
            em_manutencao: false
        };

        if (rawLogs.length > 0) {
            const latest = rawLogs[0];
            sensorInfo = {
                ...sensorInfo,
                latitude: latest.latitude ?? latest.lat,
                longitude: latest.longitude ?? latest.lng,
                altitude: latest.altitude ?? 0
            };
        }

        return res.status(200).json({ info: sensorInfo, history: filteredLogs });

    } catch (error) {
        console.error(`Erro histórico sensor ${req.params.mac}:`, error.message);
        return res.status(500).json({ error: error.message });
    }
});


// ==================================================================
// ROTAS DE PORTAS (DOOR LOGS) - UNIFICADO
// ==================================================================

app.get('/api/doors/latest', async (req, res) => {
    try {
        const { data: logs, error: logError } = await supabase.from('view_latest_door_status').select('*');
        if (logError) throw logError;

        const { data: configs, error: configError } = await supabase.from('sensor_configs').select('mac, display_name');
        
        // Mapa: MAC -> Nome da Câmara
        const nameMap = new Map(configs?.map(c => [c.mac, c.display_name]) || []);

        const result = logs.map(log => {
            const nomeAmigavel = nameMap.get(log.sensor_mac) || `Câmara ${log.sensor_mac}`;
            
            return {
                ...log,
                display_name: nomeAmigavel,
                status_text: log.is_open ? 'ABERTA (Virtual)' : 'FECHADO',
                status_color: log.is_open ? 'red' : 'green',
                is_configured: nameMap.has(log.sensor_mac) 
            };
        });

        result.sort((a, b) => a.display_name.localeCompare(b.display_name));
        return res.status(200).json(result);

    } catch (error) {
        console.error('Erro em API Doors:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Frontend Rodando em http://localhost:${PORT}`);
});