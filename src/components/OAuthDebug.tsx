import React from "react";
import { useSearchParams } from "react-router-dom";

const OAuthDebug: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Solo mostrar en desarrollo
  if (import.meta.env.PROD) {
    return null;
  }

  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userParam = searchParams.get("user");

  if (!accessToken && !refreshToken && !userParam) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded z-50 max-w-md">
      <h3 className="font-bold mb-2">🔍 OAuth Debug (Solo Dev)</h3>
      <div className="text-xs space-y-1">
        <div><strong>Access Token:</strong> {accessToken ? "✅ Presente" : "❌ Ausente"}</div>
        <div><strong>Refresh Token:</strong> {refreshToken ? "✅ Presente" : "❌ Ausente"}</div>
        <div><strong>User:</strong> {userParam ? "✅ Presente" : "❌ Ausente"}</div>
        {userParam && (
          <details className="mt-2">
            <summary className="cursor-pointer">Ver datos del usuario</summary>
            <pre className="mt-1 text-xs bg-yellow-200 p-2 rounded overflow-auto">
              {JSON.stringify(JSON.parse(decodeURIComponent(userParam)), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default OAuthDebug;