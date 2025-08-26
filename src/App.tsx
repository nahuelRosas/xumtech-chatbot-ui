import { useAuth } from "./hooks/useAuth";
import { GiChefToque, GiExitDoor, GiDoor } from "react-icons/gi";
import Chat from "./components/chat/Chat";

function App() {
  const { user, loading, signIn, signOut } = useAuth();

  return (
    <div className="h-screen p-6 bg-gray-50 text-gray-900 flex flex-col overflow-hidden w-full">
      <header className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-white shadow-sm">
            <GiChefToque className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">Mastra Cocina</h1>
            <p className="text-sm text-gray-500">
              Tu asistente para recetas y consejos culinarios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-md shadow-sm"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <svg
                className="w-4 h-4 text-amber-500 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span className="text-sm text-gray-500">Cargando</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-800">
                {user.displayName ?? user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer"
                title="Cerrar sesión"
              >
                <GiExitDoor className="w-4 h-4 text-gray-700" />
                <span className="text-sm">Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md shadow hover:bg-amber-600 cursor-pointer"
              title="Iniciar sesión"
            >
              <GiDoor className="w-4 h-4 text-white" />
              <span>Iniciar sesión</span>
            </button>
          )}
        </div>
      </header>

      <main className="w-full mt-8 flex-1 overflow-hidden">
        {loading ? (
          <div
            className="p-6 border rounded-xl bg-white border-gray-200 flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-16 h-16 text-amber-500 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span className="text-sm text-gray-500">Cargando...</span>
              <span className="sr-only">
                Cargando contenido, por favor espera
              </span>
            </div>
          </div>
        ) : user ? (
          <Chat />
        ) : (
          <div className="p-6 text-center border rounded-xl bg-white border-gray-200">
            <p className="text-gray-500">
              Inicia sesión para chatear con Mastra, tu asistente de cocina.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
