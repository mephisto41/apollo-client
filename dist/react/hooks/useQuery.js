import { useBaseQuery } from "./utils/useBaseQuery.js";
export function useQuery(query, options) {
    console.log("useQuery");
    return useBaseQuery(query, options, false);
}
//# sourceMappingURL=useQuery.js.map