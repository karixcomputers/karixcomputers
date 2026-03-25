import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{
      height: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundColor: '#0b1020',
      color: '#ffffff',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '120px', margin: 0, color: '#4f46e5', fontWeight: '900' }}>404</h1>
      <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Componenta aceasta lipsește din build-ul nostru! 🛠️</h2>
      <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '30px' }}>
        Se pare că ai ajuns pe o rută care nu există. Verifică URL-ul sau întoarce-te la shop pentru componentele care chiar funcționează.
      </p>
      <Link to="/" style={{
        padding: '12px 30px',
        backgroundColor: '#4f46e5',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        transition: '0.3s'
      }}>
        Înapoi la Home
      </Link>
    </div>
  );
};

export default NotFound;