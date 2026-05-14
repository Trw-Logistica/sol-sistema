import { useState } from 'react';
import { updateMonitoramento } from '../../services/cargas';

const ETAPAS = [
  { key: 'carregamento', label: 'Carregamento' },
  { key: 'em_transito',  label: 'Em Trânsito'  },
  { key: 'descarga',     label: 'Descarga'      },
];

function fmtHorario(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toInputVal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function TabMonitoramento({ cargaId, steps = [], canEdit, admin, onRefresh }) {
  const [saving, setSaving] = useState(null);
  const [erro, setErro] = useState(null);

  const stepMap = {};
  steps.forEach(s => { stepMap[s.etapa] = s; });

  const stateOf = key => {
    if (stepMap[key]?.concluido) return 'done';
    const firstPending = ETAPAS.find(e => !stepMap[e.key]?.concluido);
    return firstPending?.key === key ? 'active' : 'pending';
  };

  const handleToggle = async key => {
    setErro(null);
    const nowDone = stepMap[key]?.concluido || false;
    if (!nowDone && key === 'descarga') {
      if (!confirm('Confirmar conclusão da carga? Isso irá mover para Concluído.')) return;
    }
    setSaving(key);
    try {
      await updateMonitoramento(cargaId, key, { concluido: !nowDone });
      await onRefresh();
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Erro ao atualizar. Verifique se a migration foi aplicada no Supabase.');
    } finally {
      setSaving(null);
    }
  };

  const handleHorario = async (key, raw) => {
    if (!raw) return;
    setErro(null);
    setSaving(key);
    try {
      await updateMonitoramento(cargaId, key, { concluido: true, horario: new Date(raw).toISOString() });
      await onRefresh();
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Erro ao salvar horário.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mon-tl">
      {erro && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 14 }}>
          ⚠ {erro}
        </div>
      )}

      {ETAPAS.map((etapa, idx) => {
        const step = stepMap[etapa.key] || {};
        const state = stateOf(etapa.key);
        const isLast = idx === ETAPAS.length - 1;
        const isSaving = saving === etapa.key;
        const isChecked = !!step.concluido;

        return (
          <div key={etapa.key} className="mon-step">
            {/* Left: visual dot + connector */}
            <div className="mon-side">
              <div className={`mon-dot ${state}`}>{state === 'done' ? '✓' : idx + 1}</div>
              {!isLast && <div className={`mon-conn${state === 'done' ? ' done' : ''}`} />}
            </div>

            {/* Right: checkbox + name + meta */}
            <div className="mon-body">
              <label className={`mon-label${!canEdit ? ' mon-label-ro' : ''}`}>
                <input
                  type="checkbox"
                  className="mon-check"
                  checked={isChecked}
                  onChange={() => canEdit && !isSaving && handleToggle(etapa.key)}
                  disabled={!canEdit || isSaving}
                />
                <span className={`mon-name ${state}`}>
                  {etapa.label}
                  {isSaving && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>salvando…</span>}
                </span>
              </label>

              {isChecked ? (
                <div className="mon-meta">
                  {step.usuarios?.nome && (
                    <span className="mon-by">por <strong>{step.usuarios.nome}</strong></span>
                  )}
                  {admin ? (
                    <input
                      type="datetime-local"
                      className="fi mon-time-input"
                      value={toInputVal(step.horario)}
                      onChange={ev => handleHorario(etapa.key, ev.target.value)}
                      disabled={isSaving}
                    />
                  ) : (
                    step.horario && <div className="mon-time">{fmtHorario(step.horario)}</div>
                  )}
                </div>
              ) : (
                <div className="mon-hint">
                  {state === 'active' ? 'Em andamento' : 'Pendente'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
