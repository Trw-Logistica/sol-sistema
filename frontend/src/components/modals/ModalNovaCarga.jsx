import { useState } from 'react';
import { today } from '../../constants';
import MotSearch from '../MotSearch';
import { VEICULOS, CARROCERIAS } from '../../constants';

const BLANK = {
  cte: '', cliente_id: '', origem: '', destino: '',
  data_coleta: today(), previsao_entrega: '',
  frete_cobrado: '', frete_pago: '', frete_liquido: '',
  motorista_id: '',
};

const BLANK_MOT = { nome: '', telefone: '', tipo_veiculo: '', carroceria: '', placa_cavalo: '', placa_carreta: '' };

export default function ModalNovaCarga({ clientes, mots, onSave, onClose, carga: cargaEdit }) {
  const editMode = !!cargaEdit;

  const [motMode, setMotMode] = useState('existente');
  const [f, setF] = useState(() => cargaEdit ? {
    cte:              cargaEdit.cte || '',
    cliente_id:       cargaEdit.cliente_id || '',
    origem:           cargaEdit.origem || '',
    destino:          cargaEdit.destino || '',
    data_coleta:      cargaEdit.data_coleta || today(),
    previsao_entrega: cargaEdit.previsao_entrega || '',
    frete_cobrado:    cargaEdit.frete_cobrado ?? '',
    frete_pago:       cargaEdit.frete_pago ?? '',
    frete_liquido:    cargaEdit.frete_liquido ?? '',
    motorista_id:     cargaEdit.motorista_id || '',
  } : { ...BLANK });
  const [novoMot, setNovoMot] = useState(BLANK_MOT);
  const [salvando, setSalvando] = useState(false);

  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));
  const setMot = k => ev => setNovoMot(p => ({ ...p, [k]: ev.target.value }));

  const ok = f.cliente_id && f.origem && f.destino && f.frete_cobrado;

  const salvar = async () => {
    if (!ok) return;
    setSalvando(true);
    try {
      const payload = {
        cliente_id:       f.cliente_id,
        motorista_id:     f.motorista_id || null,
        origem:           f.origem,
        destino:          f.destino,
        data_coleta:      f.data_coleta || null,
        previsao_entrega: f.previsao_entrega || null,
        frete_cobrado:    parseFloat(f.frete_cobrado) || null,
        frete_pago:       parseFloat(f.frete_pago) || null,
        frete_liquido:    f.frete_liquido !== '' ? parseFloat(f.frete_liquido) : null,
        cte:              f.cte || null,
      };

      if (motMode === 'novo' && novoMot.nome) {
        payload.novoMot = novoMot;
      }

      await onSave(payload);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="ov">
      <div className="modal">
        <div className="mhd">
          <div className="mttl">{editMode ? 'Editar carga' : 'Nova carga'}</div>
          <button className="mx" onClick={onClose}>×</button>
        </div>
        <div className="mbd">
          <div className="fsec">Identificação</div>
          <div className="fgrid">
            <div className="fg">
              <label className="fl">CTE (pode preencher depois)</label>
              <input className="fi" value={f.cte} onChange={set('cte')} placeholder="CTE-000000" />
            </div>
            <div className="fg">
              <label className="fl">Cliente *</label>
              <select className="fi" value={f.cliente_id} onChange={set('cliente_id')}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="fsec">Rota</div>
          <div className="fgrid">
            <div className="fg"><label className="fl">Origem *</label><input className="fi" value={f.origem} onChange={set('origem')} placeholder="Cidade de origem" /></div>
            <div className="fg"><label className="fl">Destino *</label><input className="fi" value={f.destino} onChange={set('destino')} placeholder="Cidade de destino" /></div>
          </div>
          <div className="fgrid">
            <div className="fg"><label className="fl">Data de Coleta</label><input type="date" className="fi" value={f.data_coleta} onChange={set('data_coleta')} /></div>
            <div className="fg"><label className="fl">Previsão de Entrega</label><input type="date" className="fi" value={f.previsao_entrega} onChange={set('previsao_entrega')} /></div>
          </div>

          <div className="fsec">Motorista</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['existente', 'novo'].map(m => (
              <button
                key={m}
                className={`btn ${motMode === m ? 'btn-p' : 'btn-g'} btn-sm`}
                onClick={() => setMotMode(m)}
              >
                {m === 'existente' ? 'Motorista cadastrado' : 'Novo motorista'}
              </button>
            ))}
          </div>

          {motMode === 'existente' && (
            <MotSearch mots={mots} value={f.motorista_id} onChange={id => setF(p => ({ ...p, motorista_id: id }))} />
          )}

          {motMode === 'novo' && (
            <div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Nome *</label><input className="fi" value={novoMot.nome} onChange={setMot('nome')} placeholder="Nome completo" /></div>
                <div className="fg"><label className="fl">Telefone</label><input className="fi" value={novoMot.telefone} onChange={setMot('telefone')} placeholder="(00) 00000-0000" /></div>
              </div>
              <div className="fgrid">
                <div className="fg">
                  <label className="fl">Tipo de Veículo</label>
                  <select className="fi" value={novoMot.tipo_veiculo} onChange={setMot('tipo_veiculo')}>
                    <option value="">Selecione...</option>
                    {VEICULOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Tipo de Carroceria</label>
                  <select className="fi" value={novoMot.carroceria} onChange={setMot('carroceria')}>
                    <option value="">Selecione...</option>
                    {CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Placa do Cavalo</label><input className="fi" value={novoMot.placa_cavalo} onChange={setMot('placa_cavalo')} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} /></div>
                <div className="fg"><label className="fl">Placa da Carreta</label><input className="fi" value={novoMot.placa_carreta} onChange={setMot('placa_carreta')} placeholder="XYZ-9999 (opcional)" style={{ textTransform: 'uppercase' }} /></div>
              </div>
            </div>
          )}

          <div className="fsec">Financeiro</div>
          <div className="fgrid">
            <div className="fg">
              <label className="fl">Frete Cobrado (R$) *</label>
              <input type="number" className="fi" value={f.frete_cobrado} onChange={set('frete_cobrado')} placeholder="0,00" />
            </div>
            <div className="fg">
              <label className="fl">Frete Pago (R$)</label>
              <input type="number" className="fi" value={f.frete_pago} onChange={set('frete_pago')} placeholder="0,00" />
            </div>
          </div>
          <div className="fgrid">
            <div className="fg">
              <label className="fl">Frete Líquido (R$)</label>
              <input type="number" className="fi" value={f.frete_liquido} onChange={set('frete_liquido')} placeholder="0,00" />
            </div>
            <div />
          </div>
        </div>

        <div className="mft">
          <div />
          <div className="mft-actions">
            <button className="btn btn-g" onClick={onClose}>Cancelar</button>
            <button className="btn btn-p" disabled={!ok || salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : editMode ? 'Salvar alterações' : 'Salvar carga'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
