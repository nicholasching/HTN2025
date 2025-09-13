import BeeperExample from "@/components/BeeperExample";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">HTN 2025 - AI Chat Agents</h1>
            </div>
            <nav className="flex space-x-4">
              <Link 
                href="/suggestion-demo"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                💡 Suggestion Agent Demo
              </Link>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Main Chat Interface with All Agents */}
      <BeeperExample />
    </div>
  );
}
