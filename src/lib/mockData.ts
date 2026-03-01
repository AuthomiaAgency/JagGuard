export const MOCK_GROUPS = [
  { id: 'prevention', name: 'Prevención', icon: 'shield' },
  { id: 'tracks', name: 'Rastros', icon: 'paw' },
  { id: 'regulations', name: 'Normativa', icon: 'book' },
  { id: 'fauna', name: 'Fauna Local', icon: 'leaf' }
];

export const MOCK_GUIDES = [
  {
    id: 'g1',
    group: 'Prevención',
    title: 'Cómo proteger tu ganado',
    subtitle: 'Medidas efectivas para evitar ataques de depredadores',
    image_url: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80',
    read_time: 5,
    content: '<p>El uso de corrales nocturnos es una de las medidas más efectivas...</p>'
  },
  {
    id: 'g2',
    group: 'Rastros',
    title: 'Identificación de huellas de Jaguar',
    subtitle: 'Diferencias clave entre huellas de jaguar y puma',
    image_url: 'https://images.unsplash.com/photo-1615456935706-e3d81b877222?auto=format&fit=crop&w=800&q=80',
    read_time: 3,
    content: '<p>Las huellas de jaguar son más grandes y robustas...</p>'
  },
  {
    id: 'g3',
    group: 'Normativa',
    title: 'Ley de Protección de Fauna',
    subtitle: 'Conoce tus derechos y obligaciones',
    image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
    read_time: 7,
    content: '<p>La caza de jaguares está prohibida por ley...</p>'
  }
];

export const MOCK_HISTORY = [
  {
    id: 'h1',
    type: 'avistamiento',
    animal: 'jaguar',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    status: 'verified',
    lat: -16.290154,
    lng: -63.588653,
    photo_url: 'https://images.unsplash.com/photo-1615456935706-e3d81b877222?auto=format&fit=crop&w=200&q=80',
    notes: 'Avistamiento cerca del río.',
    user_name: 'Juan Pérez'
  },
  {
    id: 'h2',
    type: 'huella',
    animal: 'puma',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    status: 'pending',
    lat: -16.3,
    lng: -63.6,
    photo_url: null,
    notes: 'Huellas frescas en el sendero.',
    user_name: 'Maria Garcia'
  }
];

export const MOCK_REPORTS = MOCK_HISTORY;

export const MOCK_REDEMPTIONS = [
  {
    id: 'r1',
    user_id: 'u1',
    user_name: 'Juan Pérez',
    contact: 'juan@example.com',
    points: 150,
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export const MOCK_USERS = [
  {
    id: 'u1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'user',
    points: 50,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan'
  },
  {
    id: 'u2',
    name: 'Admin User',
    email: 'admin@coex5.com',
    role: 'admin',
    points: 100,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  }
];
