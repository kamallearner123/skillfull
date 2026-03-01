import React, { useState } from 'react';

const AIAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/ai-assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      setResponse('Error fetching response.');
    }
    setLoading(false);
  };

  return (
    <div className="ai-assistant-tab">
      <h2>AI Assistant</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask SmartGuide..."
          required
        />
        <button type="submit" disabled={loading}>Query</button>
      </form>
      <div className="response">
        {loading ? 'Loading...' : response}
      </div>
    </div>
  );
};

export default AIAssistant;
