import { useEffect, useState } from "react";
import { Mic, MicOff, UserCheck, Users } from "lucide-react";
import { AudioDevice } from "../types";

interface Props {
  onStart: (params: {
    advisor_name: string;
    client_name: string;
    description: string;
    language: string;
    device_index?: number;
  }) => void;
  loading: boolean;
}

export function SessionForm({ onStart, loading }: Props) {
  const [advisorName, setAdvisorName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("pt");
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [deviceIndex, setDeviceIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data: AudioDevice[]) => {
        setDevices(data);
        if (data.length > 0) setDeviceIndex(data[0].index);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorName.trim() || !clientName.trim()) return;
    onStart({ advisor_name: advisorName.trim(), client_name: clientName.trim(), description, language, device_index: deviceIndex });
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Reunião</h1>
          <p className="text-gray-500 mt-1">Preencha os dados para iniciar a transcrição</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Assessor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <UserCheck className="inline w-4 h-4 mr-1 text-blue-600" />
              Nome do Assessor
            </label>
            <input
              type="text"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              placeholder="Ex: João Silva"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Users className="inline w-4 h-4 mr-1 text-green-600" />
              Nome do Cliente
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Maria Santos"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Revisão de portfólio trimestral"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Idioma</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Microfone */}
          {devices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <MicOff className="inline w-4 h-4 mr-1 text-gray-500" />
                Microfone
              </label>
              <select
                value={deviceIndex ?? ""}
                onChange={(e) => setDeviceIndex(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {devices.map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !advisorName.trim() || !clientName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors"
          >
            <Mic className="w-5 h-5" />
            {loading ? "Iniciando..." : "Iniciar Gravação"}
          </button>
        </form>
      </div>
    </div>
  );
}
