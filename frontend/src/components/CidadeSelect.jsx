import { useMemo } from 'react';
import Select from 'react-select';
import cidades from '../data/cidades.json';

const normalize = str =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const customStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    fontSize: 13,
    borderRadius: 8,
    border: state.isFocused ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59,130,246,.15)' : 'none',
    background: 'var(--surface)',
    fontFamily: 'var(--fn)',
    '&:hover': { borderColor: 'var(--accent)' },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    fontFamily: 'var(--fn)',
    background: state.isFocused ? 'var(--surface2)' : 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer',
  }),
  menu: base => ({
    ...base,
    borderRadius: 8,
    border: '1px solid var(--border)',
    boxShadow: 'var(--sh-sm, 0 4px 16px rgba(0,0,0,.12))',
    zIndex: 9999,
  }),
  placeholder: base => ({ ...base, color: 'var(--text3)', fontSize: 13 }),
  singleValue: base => ({ ...base, color: 'var(--text)', fontSize: 13 }),
  input: base => ({ ...base, color: 'var(--text)', fontSize: 13 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: base => ({ ...base, padding: '0 6px', color: 'var(--text3)' }),
};

const filterOption = (option, inputValue) => {
  if (!inputValue || inputValue.length < 2) return false;
  const q = normalize(inputValue);
  return normalize(option.data.cidade).includes(q) || normalize(option.data.estado).includes(q);
};

export default function CidadeSelect({ value, onChange, placeholder = 'Digite a cidade...' }) {
  const selected = useMemo(
    () => value ? (cidades.find(c => c.label === value) || { value, label: value, cidade: value, estado: '' }) : null,
    [value]
  );

  return (
    <Select
      options={cidades}
      value={selected}
      onChange={opt => onChange(opt ? opt.label : '')}
      filterOption={filterOption}
      placeholder={placeholder}
      noOptionsMessage={({ inputValue }) =>
        !inputValue || inputValue.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhuma cidade encontrada'
      }
      styles={customStyles}
      isClearable
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  );
}
