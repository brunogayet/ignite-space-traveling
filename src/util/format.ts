import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export const formatDate = (dateToFormat: string): string => {
  return format(new Date(dateToFormat), 'dd LLL yyyy', {
    locale: ptBR,
  });
};
