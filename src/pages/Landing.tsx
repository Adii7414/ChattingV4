import Nav from '../components/Nav';
import Hero from '../components/Hero';
import Unfold from '../components/Unfold';
import Organize from '../components/Organize';
import Presence from '../components/Presence';
import Speed from '../components/Speed';
import Detail from '../components/Detail';
import Privacy from '../components/Privacy';
import Everywhere from '../components/Everywhere';
import Faq from '../components/Faq';
import FinalCta from '../components/FinalCta';

export default function Landing() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Unfold />
        <Organize />
        <Presence />
        <Speed />
        <Detail />
        <Privacy />
        <Everywhere />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
