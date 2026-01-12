import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Supabase
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * MIDDLEWARE DE SEGURANÇA (API KEY)
 */
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

// Aplica a proteção em todas as rotas /api
app.use('/api', authMiddleware);

// --- ENDPOINTS DE DISPOSITIVOS ---

/**
 * GET /api/dispositivos
 * Retorna Gateways e Sensores vinculados, cruzando com a tabela de configurações.
 */
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
                    // Devolvemos para o front como max_temp/max_hum para manter compatibilidade
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

// PATCH SEGURO E SIMPLIFICADO
app.patch('/api/dispositivos', async (req, res) => {
    try {
     
        const { mac, display_name, batt_warning, temp_max, hum_max, max_temp, max_hum } = req.body;

        if (!mac) return res.status(400).json({ error: 'MAC Obrigatório' });

        // Normalização dos dados (resolve nomes trocados e garante números)
        const payload = {
            mac: mac,
            display_name: display_name,
            batt_warning: Number(batt_warning || 20),
            temp_max: Number(temp_max !== undefined ? temp_max : (max_temp || 0)),
            hum_max: Number(hum_max !== undefined ? hum_max : (max_hum || 0)),
            updated_at: new Date().toISOString()
        };

        // Envio para o banco
        const { data, error } = await supabase
            .from('sensor_configs')
            .upsert(payload, { onConflict: 'mac' })
            .select();

        if (error) {
            console.error("❌ Erro Supabase:", JSON.stringify(error));
            throw error; // Joga para o catch
        }

        return res.status(200).json({ message: 'Salvo!', data: data[0] });

    } catch (error) {
        console.error("❌ Erro 500:", error);
        return res.status(500).json({ 
            error: error.message || "Erro desconhecido ao salvar."
        });
    }
});

// --- ENDPOINTS DE TELEMETRIA ---

app.get('/api/sensores', async (req, res) => {
    try {
        const { mac, start, end } = req.query;
        let query = supabase.from('telemetry_logs').select('*').order('ts', { ascending: false });

        if (mac) query = query.eq('mac', mac);
        if (start) query = query.gte('ts', start);
        if (end) query = query.lte('ts', end);

        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sensores/latest
 * Retorna a última leitura de cada sensor + o Nome (display_name).
 */
app.get('/api/sensores/latest', async (req, res) => {
    try {
        // 1. Busca os logs ordenados por data (mais recente primeiro)
        const { data: logs, error: logError } = await supabase
            .from('telemetry_logs')
            .select('*')
            .order('ts', { ascending: false });

        // 2. Busca as configurações (para pegar os nomes)
        const { data: configs, error: configError } = await supabase
            .from('sensor_configs')
            .select('mac, display_name');

        if (logError) throw logError;
        // Se der erro no config, não paramos, apenas seguimos sem nomes, 
        // mas idealmente poderíamos lançar erro aqui também.

        // 3. Cria um Mapa de Nomes para acesso rápido
        // Ex: { "BC:57...": "Câmera Fria 01" }
        const configMap = new Map(configs?.map(c => [c.mac, c.display_name]) || []);

        // 4. Processa a lista para pegar apenas o único mais recente de cada MAC
        const uniqueLatest = Array.from(
            logs.reduce((map, item) => {
                // Se este MAC ainda não está no mapa, adicionamos (pois é o mais recente devido ao sort)
                if (!map.has(item.mac)) {
                    map.set(item.mac, {
                        ...item, // Copia todos os dados do log (temp, hum, rssi, etc)
                        // Adiciona o nome vindo do configMap, ou um padrão se não existir
                        display_name: configMap.get(item.mac) || 'Sensor Sem Nome'
                    });
                }
                return map;
            }, new Map()).values()
        );

        // Opcional: Reordenar por nome ou mac para ficar bonito no front
        uniqueLatest.sort((a, b) => a.mac.localeCompare(b.mac));

        return res.status(200).json(uniqueLatest);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sensores/:mac
 * Retorna:
 * 1. As configurações do sensor (Info)
 * 2. O histórico de leituras (History)
 */
app.get('/api/sensores/:mac', async (req, res) => {
    try {
        const { mac } = req.params;
        const { period = '24h', limit } = req.query;

        // --- PREPARAÇÃO DA QUERY DE LOGS (HISTÓRICO) ---
        let logsQuery = supabase
            .from('telemetry_logs')
            .select('*')
            .eq('mac', mac)
            .order('ts', { ascending: false });

        // Filtro de Período
        if (period !== 'all') {
            const agora = new Date();
            let dataInicio;
            if (period === '1h') dataInicio = new Date(agora.getTime() - 3600000);
            else if (period === '24h') dataInicio = new Date(agora.getTime() - 86400000);
            else if (period === '7d') dataInicio = new Date(agora.getTime() - 604800000);
            
            if (dataInicio) logsQuery = logsQuery.gte('ts', dataInicio.toISOString());
        }

        // Limite de registros
        if (limit) logsQuery = logsQuery.limit(parseInt(limit));

        // --- PREPARAÇÃO DA QUERY DE CONFIG (INFO) ---
        const configQuery = supabase
            .from('sensor_configs')
            .select('*')
            .eq('mac', mac)
            .maybeSingle(); // maybeSingle não dá erro se não achar (retorna null)

        // --- EXECUÇÃO EM PARALELO (Mais rápido) ---
        const [logsResult, configResult] = await Promise.all([logsQuery, configQuery]);

        // Verificação de erros
        if (logsResult.error) throw logsResult.error;
        if (configResult.error) throw configResult.error;

        // --- MONTAGEM DA RESPOSTA ---
        // Se não tiver config salva, criamos um objeto padrão para o front não quebrar
        const sensorInfo = configResult.data || {
            mac: mac,
            display_name: 'Sensor Não Configurado',
            batt_warning: 20,
            temp_max: 0,
            hum_max: 0
        };

        return res.status(200).json({
            info: sensorInfo,     // Dados estáticos (Nome, Alertas)
            history: logsResult.data // Dados temporais (Gráfico)
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Rodando em http://localhost:${PORT}`);
});