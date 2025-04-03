"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log do erro para o servidor
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Erro</h1>
        <h2 className="text-2xl font-medium text-gray-700 mb-6">Algo deu errado</h2>
        <p className="text-gray-600 mb-8">
          Desculpe, ocorreu um erro ao processar sua solicitação.
        </p>
        <button
          onClick={() => reset()}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
} 