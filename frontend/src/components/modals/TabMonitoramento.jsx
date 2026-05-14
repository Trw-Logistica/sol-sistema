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

  const stepMap = {};
  steps.forEach(s => { stepMap[s.etapa] = s; });

  const stateOf = key => {
    if (stepMap[key]?.concluido) return 'done';
    const firstPending = ETAPAS.find(e => !stepMap[e.key]?.concluido);
    return firstPending?.key === key ? 'active' : 'pending';
  };

  const handleToggle = async key => {
    const nowDone = stepMap[key]?.concluido || false;
    if (!nowDone && key === 'descarga') {
      if (!confirm('Confirmar conclusão da carga? Isso irá mover para Concluído.')) return;
    }
    setSaving(key);
    try {
      await updateMonitoramento(cargaId, key, { concluido: !nowDone });
      await onRefresh();
    } finally {
      setSaving(null);
    }
  };

  const handleHorario = async (key, raw) => {
    if (!raw) return;
    setSaving(key);
    try {
      await updateMonitoramento(cargaId, key, { concluido: true, horario: new Date(raw).toISOString() });
      await onRefresh();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mon-tl">
      {ETAPAS.map((etapa, idx) => {
        const step = stepMap[etapa.key] || {};
        const state = stateOf(etapa.key);
        const isLast = idx === ETAPAS.length - 1;
        const isSaving = saving === etapa.key;
        const checkable = canEdit && !isSaving;

        return (
          <div key={etapa.key} className="mon-step">
            <div className="mon-side">
              <button
                className={`mon-dot ${state}`}
                onClick={checkable ? () => handleToggle(etapa.key) : undefined}
                disabled={!checkable}
                title={step.concluido ? 'Clique para desmarcar' : 'Marcar como concluído'}
              >
                {state === 'done' ? '✓' : idx + 1}
              </button>
              {!isLast && <div className={`mon-conn${state === 'done' ? ' done' : ''}`} />}
            </div>

            <div className="mon-body">
              <div className={`mon-name ${state}`}>{etapa.label}</div>

              {step.concluido ? (
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
              ) : state === 'active' ? (
                <div className="mon-hint">Aguardando confirmação</div>
              ) : (
                <div className="mon-hint">Pendente</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
