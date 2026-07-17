import { useQuery } from "@tanstack/react-query";
import { fetchActivityLogs } from "@/services/activityLogService";

export function useActivityLogs(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ["activityLogs", page, pageSize],
    queryFn: () => fetchActivityLogs(page, pageSize),
  });
}
