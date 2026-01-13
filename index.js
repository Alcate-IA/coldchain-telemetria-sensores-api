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
                    max_hum: config.hum_max || 0
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
        const { mac, display_name, batt_warning, temp_max, hum_max, max_temp, max_hum } = req.body;
        if (!mac) return res.status(400).json({ error: 'MAC Obrigatório' });

        const payload = {
            mac: mac,
            display_name: display_name,
            batt_warning: Number(batt_warning || 20),
            temp_max: Number(temp_max !== undefined ? temp_max : (max_temp || 0)),
            hum_max: Number(hum_max !== undefined ? hum_max : (max_hum || 0)),
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
        const { data: logs, error: logError } = await supabase.from('telemetry_logs').select('*').order('ts', { ascending: false });
        const { data: configs } = await supabase.from('sensor_configs').select('mac, display_name');

        if (logError) throw logError;

        const configMap = new Map(configs?.map(c => [c.mac, c.display_name]) || []);

        const uniqueLatest = Array.from(
            logs.reduce((map, item) => {
                if (!map.has(item.mac)) {
                    map.set(item.mac, {
                        ...item,
                        display_name: configMap.get(item.mac) || 'Sensor Sem Nome'
                    });
                }
                return map;
            }, new Map()).values()
        );

        uniqueLatest.sort((a, b) => a.display_name.localeCompare(b.display_name));
        return res.status(200).json(uniqueLatest);
    } catch (error) {
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

app.get('/api/sensores/:mac', async (req, res) => {
    try {
        const { mac } = req.params;
        const { period = '24h', limit } = req.query;

        let logsQuery = supabase.from('telemetry_logs').select('*').eq('mac', mac).order('ts', { ascending: false });

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

        // Downsampling de 10 minutos
        const rawLogs = logsResult.data || [];
        const filteredLogs = [];
        let lastKeptTime = 0;
        const TEN_MINUTES_MS = 10 * 60 * 1000;

        for (const log of rawLogs) {
            const logTime = new Date(log.ts).getTime();
            if (lastKeptTime === 0 || Math.abs(lastKeptTime - logTime) >= TEN_MINUTES_MS) {
                filteredLogs.push(log);
                lastKeptTime = logTime;
            }
        }

        const sensorInfo = configResult.data || {
            mac: mac,
            display_name: 'Sensor Não Configurado',
            batt_warning: 20,
            temp_max: 0,
            hum_max: 0
        };

        return res.status(200).json({ info: sensorInfo, history: filteredLogs });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Rodando em http://localhost:${PORT}`);
});