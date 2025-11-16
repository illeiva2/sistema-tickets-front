import * as React from "react";
import { cn } from "../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <div
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
);

// Variantes específicas para tickets
export const TicketSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-4 w-[120px]" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-[80%]" />
  </div>
);

export const TicketCardSkeleton = () => (
  <div className="rounded-lg border bg-card p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-[200px]" />
      <Skeleton className="h-6 w-[80px]" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-[70%]" />
    <div className="flex items-center space-x-4">
      <Skeleton className="h-8 w-[100px]" />
      <Skeleton className="h-8 w-[80px]" />
    </div>
  </div>
);

export const DashboardCardSkeleton = () => (
  <div className="rounded-lg border bg-card p-6">
    <div className="flex items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-4" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-8 w-[60px]" />
      <Skeleton className="h-3 w-[120px]" />
    </div>
  </div>
);
