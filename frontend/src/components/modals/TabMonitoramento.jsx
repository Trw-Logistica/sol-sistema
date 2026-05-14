import { useState, useEffect, useRef } from 'react';
import { updateMonitoramento } from '../../services/cargas';

const ETAPAS = [
  { key: 'carregamento', label: 'Carregamento' },
  { key: 'em_transito',  label: 'Em Trânsito'  },
  { key: 'descarga',     label: 'Descarga'      },
];

function fmtHorario(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function isoToEdit(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return {
    date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

function parseEdit(date, time) {
  const dp = date.split('/');
  const tp = time.split(':');
  if (dp.length !== 3 || tp.length !== 2) return null;
  const d = new Date(+dp[2], +dp[1] - 1, +dp[0], +tp[0], +tp[1]);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function TabMonitoramento({ cargaId, steps = [], canEdit, onRefresh, onComplete }) {
  const [saving, setSaving]               = useState(null);
  const [erro, setErro]                   = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [editingTime, setEditingTime]     = useState(null);
  const [editVal, setEditVal]             = useState({ date: '', time: '' });
  const completedFired                    = useRef(false);

  const stepMap = {};
  steps.forEach(s => { stepMap[s.etapa] = s; });

  const allDone = ETAPAS.every(e => stepMap[e.key]?.concluido);

  useEffect(() => {
    if (!allDone || completedFired.current) return;
    completedFired.current = true;
    const t = setTimeout(() => onComplete?.(), 2200);
    return () => clearTimeout(t);
  }, [allDone]);

  const stateOf = key => {
    if (stepMap[key]?.concluido) return 'done';
    const first = ETAPAS.find(e => !stepMap[e.key]?.concluido);
    return first?.key === key ? 'active' : 'pending';
  };

  const doToggle = async key => {
    setErro(null);
    setPendingConfirm(null);
    setSaving(key);
    try {
      const nowDone = stepMap[key]?.concluido || false;
      await updateMonitoramento(cargaId, key, { concluido: !nowDone });
      await onRefresh();
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Erro ao atualizar etapa.');
    } finally {
      setSaving(null);
    }
  };

  const handleCheckbox = key => {
    if (!canEdit || saving) return;
    const isChecked = stepMap[key]?.concluido || false;
    if (isChecked) {
      doToggle(key);
    } else if (pendingConfirm === key) {
      setPendingConfirm(null);
    } else {
      setPendingConfirm(key);
    }
  };

  const startEdit = key => {
    setEditingTime(key);
    setEditVal(isoToEdit(stepMap[key]?.horario));
  };

  const saveEdit = async key => {
    const iso = parseEdit(editVal.date, editVal.time);
    if (!iso) { setErro('Data ou hora inválida. Use DD/MM/AAAA e HH:MM.'); return; }
    setErro(null);
    setEditingTime(null);
    setSaving(key);
    try {
      await updateMonitoramento(cargaId, key, { concluido: true, horario: iso });
      await onRefresh();
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Erro ao salvar horário.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mon-tl">
      {allDone && (
        <div className="mon-done-banner">
          ✓ Carga concluída! Movendo para Concluído…
        </div>
      )}

      {erro && <div className="mon-erro">⚠ {erro}</div>}

      {ETAPAS.map((etapa, idx) => {
        const step      = stepMap[etapa.key] || {};
        const state     = stateOf(etapa.key);
        const isLast    = idx === ETAPAS.length - 1;
        const isSaving  = saving === etapa.key;
        const isChecked = !!step.concluido;
        const isPending = pendingConfirm === etapa.key;
        const isEditing = editingTime === etapa.key;

        return (
          <div key={etapa.key} className="mon-step">
            {/* Left: dot + connector */}
            <div className="mon-side">
              <div className={`mon-dot ${state}`}>{state === 'done' ? '✓' : idx + 1}</div>
              {!isLast && <div className={`mon-conn${state === 'done' ? ' done' : ''}`} />}
            </div>

            {/* Right: step card */}
            <div className={`mon-card${state === 'done' ? ' done' : state === 'active' ? ' active' : ''}`}>
              {/* Checkbox + label row */}
              <label className={`mon-label${!canEdit ? ' mon-label-ro' : ''}`}>
                <input
                  type="checkbox"
                  className="mon-check"
                  checked={isChecked}
                  onChange={() => handleCheckbox(etapa.key)}
                  disabled={!canEdit || isSaving || allDone}
                />
                <span className={`mon-name ${state}`}>
                  {etapa.label}
                  {isSaving && <span className="mon-saving"> salvando…</span>}
                </span>
              </label>

              {/* Inline confirmation */}
              {isPending && !isChecked && (
                <div className="mon-confirm">
                  <span>Confirmar conclusão desta etapa?</span>
                  <button className="mon-confirm-yes" onClick={() => doToggle(etapa.key)}>Sim</button>
                  <button className="mon-confirm-no"  onClick={() => setPendingConfirm(null)}>Não</button>
                </div>
              )}

              {/* Checked meta */}
              {isChecked && (
                <div className="mon-meta">
                  {step.usuarios?.nome && (
                    <span className="mon-by">por <strong>{step.usuarios.nome}</strong></span>
                  )}
                  {isEditing ? (
                    <div className="mon-edit-row">
                      <input
                        className="mon-edit-input"
                        placeholder="DD/MM/AAAA"
                        value={editVal.date}
                        maxLength={10}
                        onChange={ev => setEditVal(v => ({ ...v, date: ev.target.value }))}
                      />
                      <input
                        className="mon-edit-input mon-edit-time"
                        placeholder="HH:MM"
                        value={editVal.time}
                        maxLength={5}
                        onChange={ev => setEditVal(v => ({ ...v, time: ev.target.value }))}
                      />
                      <button className="mon-edit-save"   onClick={() => saveEdit(etapa.key)}>Salvar</button>
                      <button className="mon-edit-cancel" onClick={() => setEditingTime(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="mon-time-row">
                      {step.horario && <span className="mon-time">{fmtHorario(step.horario)}</span>}
                      {canEdit && !allDone && (
                        <button className="mon-pencil" title="Editar horário" onClick={() => startEdit(etapa.key)}>✏</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Pending hint */}
              {!isChecked && !isPending && (
                <div className="mon-hint">{state === 'active' ? 'Em andamento' : 'Pendente'}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
