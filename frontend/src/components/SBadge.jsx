import { STS, STS_CLS } from '../constants';

export default function SBadge({ status }) {
  return (
    <span className={`s-dot ${STS_CLS[status] || ''}`}>
      {STS[status] || status}
    </span>
  );
}
