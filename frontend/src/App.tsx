import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

// Define interfaces for type safety
interface Job {
  _id: string;
  inputString: string;
  regexPattern: string;
  status: 'Validating' | 'Valid' | 'Invalid';
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function App() {
  const [inputString, setInputString] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();

    // Set up socket connection for real-time updates
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });
    
    socket.on('jobUpdate', (updatedJob: Job) => {
      console.log('Job update received:', updatedJob);
      setJobs(prevJobs => {
        const jobIndex = prevJobs.findIndex(job => job._id === updatedJob._id);
        
        if (jobIndex !== -1) {
          const updatedJobs = [...prevJobs];
          updatedJobs[jobIndex] = updatedJob;
          return updatedJobs;
        } else {
          return [updatedJob, ...prevJobs];
        }
      });
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    socket.on('error', (err: any) => {
      console.error('Socket error:', err);
      setError('WebSocket connection error. Please refresh the page.');
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchJobs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get<Job[]>(`${API_BASE_URL}/jobs`);
      setJobs(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!inputString.trim()) {
      setError('Please enter a string to validate');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/jobs`, { inputString });
      setInputString('');
      setError(null);
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to submit job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Valid': return 'bg-green-100 text-green-800';
      case 'Invalid': return 'bg-red-100 text-red-800';
      case 'Validating': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Real-Time Regex Validator</h1>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Submit a String</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="inputString" className="block text-sm font-medium text-gray-700">
                Enter a string to validate
              </label>
              <input
                type="text"
                id="inputString"
                value={inputString}
                onChange={(e) => setInputString(e.target.value)}
                placeholder="Enter text to validate against regex"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Jobs</h2>
          
          {loading && jobs.length === 0 ? (
            <div className="text-center py-4">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No jobs submitted yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input String</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regex Pattern</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{job._id.substring(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{job.inputString}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{job.regexPattern}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
