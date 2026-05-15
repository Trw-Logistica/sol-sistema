const supabase = require('../config/supabase');

const listar = async (req, res) => {
  const { data, error } = await supabase
    .from('grupos_whatsapp')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const criar = async (req, res) => {
  if (req.user.perfil !== 'admin') return res.status(403).json({ error: 'Apenas administradores' });
  const { nome, link } = req.body;
  if (!nome || !link) return res.status(400).json({ error: 'Nome e link são obrigatórios' });

  const { data, error } = await supabase
    .from('grupos_whatsapp')
    .insert({ nome, link })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const deletar = async (req, res) => {
  if (req.user.perfil !== 'admin') return res.status(403).json({ error: 'Apenas administradores' });
  const { id } = req.params;
  const { error } = await supabase.from('grupos_whatsapp').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
};

module.exports = { listar, criar, deletar };
