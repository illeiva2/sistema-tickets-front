import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPerson,
  fetchPeople,
  fetchPerson,
  fetchStaffDepartments,
  updatePerson,
} from "./api";
import type { StaffListQuery, StaffSaveCommand } from "./types";

export const staffKeys = {
  all: ["it", "people"] as const,
  list: (query: StaffListQuery) => [...staffKeys.all, "list", query] as const,
  detail: (id: string) => [...staffKeys.all, "detail", id] as const,
  departments: ["departments", "staff-options"] as const,
};

export function usePeople(query: StaffListQuery) {
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => fetchPeople(query),
    staleTime: 15_000,
  });
}

export function usePersonDetail(id: string | null) {
  return useQuery({
    queryKey: staffKeys.detail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Person id is required");
      return fetchPerson(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useStaffDepartments() {
  return useQuery({
    queryKey: staffKeys.departments,
    queryFn: fetchStaffDepartments,
    staleTime: 5 * 60_000,
  });
}

export function useSavePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: StaffSaveCommand) =>
      command.mode === "edit"
        ? updatePerson(command.id, command.payload)
        : createPerson(command.payload),
    onSuccess: (person) => {
      queryClient.setQueryData(staffKeys.detail(person.id), person);
      void queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}
