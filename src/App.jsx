import { SiteProvider } from './lib/site';
import BackgroundGlow from './components/BackgroundGlow';
import ProgressDrop from './components/ProgressDrop';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import Concept from './sections/Concept';
import Routine from './sections/Routine';
import DropClip from './components/DropClip';
import LogoDesign from './sections/LogoDesign';
import BrandPost from './sections/BrandPost';
import Poster from './sections/Poster';

export default function App() {
  return (
    <SiteProvider>
      <DropClip />
      <BackgroundGlow />
      <ProgressDrop />
      <Nav />
      <main>
        <Hero />
        <Concept />
        <Routine />
        <LogoDesign />
        <BrandPost />
        <Poster />
      </main>
      <Footer />
    </SiteProvider>
  );
}
