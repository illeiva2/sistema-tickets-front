import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetKeys } from "@/features/it/inventory/useAssets";
import {
  createPurchase,
  createSupplier,
  fetchProcurementLookups,
  fetchPurchase,
  fetchPurchases,
  fetchSupplier,
  fetchSuppliers,
  transitionPurchase,
  updatePurchase,
  updateSupplier,
} from "./api";
import type {
  PurchaseListQuery,
  PurchaseSaveCommand,
  PurchaseTransitionCommand,
  SupplierListQuery,
  SupplierSaveCommand,
} from "./types";

export const procurementKeys = {
  all: ["it", "procurement"] as const,
  purchases: ["it", "procurement", "purchases"] as const,
  purchaseList: (query: PurchaseListQuery) =>
    [...procurementKeys.purchases, "list", query] as const,
  purchaseDetail: (id: string) =>
    [...procurementKeys.purchases, "detail", id] as const,
  suppliers: ["it", "procurement", "suppliers"] as const,
  supplierList: (query: SupplierListQuery) =>
    [...procurementKeys.suppliers, "list", query] as const,
  supplierDetail: (id: string) =>
    [...procurementKeys.suppliers, "detail", id] as const,
  lookups: ["it", "procurement", "lookups"] as const,
};

export function usePurchases(query: PurchaseListQuery) {
  return useQuery({
    queryKey: procurementKeys.purchaseList(query),
    queryFn: () => fetchPurchases(query),
    staleTime: 15_000,
  });
}

export function usePurchaseDetail(id: string | null) {
  return useQuery({
    queryKey: procurementKeys.purchaseDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Purchase id is required");
      return fetchPurchase(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useProcurementLookups() {
  return useQuery({
    queryKey: procurementKeys.lookups,
    queryFn: fetchProcurementLookups,
    staleTime: 5 * 60_000,
  });
}

export function useSavePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: PurchaseSaveCommand) =>
      command.mode === "edit"
        ? updatePurchase(command.id, command.payload)
        : createPurchase(command.payload),
    onSuccess: (purchase) => {
      queryClient.setQueryData(
        procurementKeys.purchaseDetail(purchase.id),
        purchase,
      );
      void queryClient.invalidateQueries({ queryKey: procurementKeys.all });
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
    },
  });
}

export function useTransitionPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: PurchaseTransitionCommand) =>
      transitionPurchase(
        command.id,
        command.transition,
        command.expectedUpdatedAt,
        command.reason,
      ),
    onSuccess: (purchase) => {
      queryClient.setQueryData(
        procurementKeys.purchaseDetail(purchase.id),
        purchase,
      );
      void queryClient.invalidateQueries({ queryKey: procurementKeys.all });
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
    },
  });
}

export function useSuppliers(query: SupplierListQuery) {
  return useQuery({
    queryKey: procurementKeys.supplierList(query),
    queryFn: () => fetchSuppliers(query),
    staleTime: 30_000,
  });
}

export function useSupplierDetail(id: string | null) {
  return useQuery({
    queryKey: procurementKeys.supplierDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Supplier id is required");
      return fetchSupplier(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSaveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SupplierSaveCommand) =>
      command.mode === "edit"
        ? updateSupplier(command.id, command.payload)
        : createSupplier(command.payload),
    onSuccess: (supplier) => {
      queryClient.setQueryData(
        procurementKeys.supplierDetail(supplier.id),
        supplier,
      );
      void queryClient.invalidateQueries({ queryKey: procurementKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
      void queryClient.invalidateQueries({
        queryKey: ["it", "maintenances", "lookups"],
      });
    },
  });
}
