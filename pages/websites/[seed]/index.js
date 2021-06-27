import { withAuth } from "../../../hoc/withAuth";
import { Container } from "../../../components/Container";
import { Dashboard } from "../../../components/Dashboard";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Website = ({ seed }) => {
  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-6xl w-full mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          Dashboard
        </h1>

        <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
          These are your websites, you can manage them by clicking on the proper buttons.
        </p>

        <Dashboard seed={seed} />
      </div>
    </Container>
  );
};

export default withAuth(Website);
