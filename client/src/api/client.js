const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('anti_english_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (username, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
    register: (username, email, password, full_name) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, full_name })
    }),
    me: () => request('/auth/me')
  },

  // Folders
  folders: {
    getAll: () => request('/folders'),
    getById: (id) => request(`/folders/${id}`),
    create: (data) => request('/folders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/folders/${id}`, {
      method: 'DELETE'
    }),
    merge: (data) => request('/folders/merge', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Cards
  cards: {
    getAll: (params = {}) => {
      const q = new URLSearchParams();
      if (params.folder_id) q.set('folder_id', params.folder_id);
      if (params.search) q.set('search', params.search);
      if (params.status) q.set('status', params.status);
      if (params.level) q.set('level', params.level);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request(`/cards${queryStr}`);
    },
    getById: (id) => request(`/cards/${id}`),
    create: (data) => request('/cards', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    bulk: (folder_id, cards) => request('/cards/bulk', {
      method: 'POST',
      body: JSON.stringify({ folder_id, cards })
    }),
    update: (id, data) => request(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    updateStatus: (id, status) => request(`/cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    delete: (id) => request(`/cards/${id}`, {
      method: 'DELETE'
    })
  },

  // Practice & Quiz
  practice: {
    getQuestions: (params = {}) => {
      const q = new URLSearchParams();
      if (params.folder_id) q.set('folder_id', params.folder_id);
      if (params.limit) q.set('limit', params.limit);
      if (params.mode) q.set('mode', params.mode);
      if (params.level) q.set('level', params.level);
      if (params.status) q.set('status', params.status);
      return request(`/practice/questions?${q.toString()}`);
    },
    checkAnswer: (cardIdOrData, user_answer, mode) => {
      const body = (typeof cardIdOrData === 'object' && cardIdOrData !== null)
        ? cardIdOrData
        : { card_id: cardIdOrData, user_answer, mode };
      return request('/practice/check', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },
    submit: (data) => request('/practice/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    submitQuiz: (data) => request('/practice/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
};
