import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PaintDefs } from './Troll';
import './styles.css';

createRoot(document.getElementById('root')!).render(<><PaintDefs /><App /></>);
