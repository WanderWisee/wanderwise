import { useEffect, useState } from 'react';
import { searchUsers } from '../services/userService';

export function useStudentSearch(query, enabled = true) {
  const term = query.trim();
  const [settled, setSettled] = useState({ term: '', results: [], error: '' });
  const active = enabled && term.length >= 2;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchUsers(term).then((results) => {
        if (alive) setSettled({ term, results, error: '' });
      }).catch((error) => {
        if (alive) setSettled({ term, results: [], error: error.message });
      });
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [active, term]);
  return {
    results: active && settled.term === term ? settled.results : [],
    error: active && settled.term === term ? settled.error : '',
    loading: active && settled.term !== term,
  };
}
