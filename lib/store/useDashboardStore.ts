import { create } from 'zustand'

interface DashboardState {
  selectedYears: Set<string | number>;
  selectedMonths: Set<string | number>;
  toggleYear: (year: string | number) => void;
  toggleMonth: (month: string | number) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedYears: new Set(),
  selectedMonths: new Set(),
  toggleYear: (year) => set((state) => {
    const newYears = new Set(state.selectedYears);
    if (newYears.has(year)) {
      newYears.delete(year);
    } else {
      newYears.add(year);
    }
    return { selectedYears: newYears };
  }),
  toggleMonth: (month) => set((state) => {
    const newMonths = new Set(state.selectedMonths);
    if (newMonths.has(month)) {
      newMonths.delete(month);
    } else {
      newMonths.add(month);
    }
    return { selectedMonths: newMonths };
  }),
  clearFilters: () => set({ selectedYears: new Set(), selectedMonths: new Set() })
}));
