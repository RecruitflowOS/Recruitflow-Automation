import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { QualificationStatus } from '@/types';

export const StatusBadge = ({ status }: { status: QualificationStatus }) => {
  const styles = {
    Qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Unqualified: 'bg-rose-100 text-rose-700 border-rose-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  const icons = {
    Qualified: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    Unqualified: <XCircle className="w-3.5 h-3.5 mr-1" />,
    Pending: <Clock className="w-3.5 h-3.5 mr-1" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
};
