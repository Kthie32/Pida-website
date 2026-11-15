import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Pillars from "./components/Pillars.jsx";
import About from "./components/About.jsx";
import Impact from "./components/Impact.jsx";
import Programmes from "./components/Programmes.jsx";
import Vision from "./components/Vision.jsx";
import News from "./components/News.jsx";
import Involved from "./components/Involved.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

// The page is simply these sections, one after another.
export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Pillars />
        <About />
        <Impact />
        <Programmes />
        <Vision />
        <News />
        <Involved />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
