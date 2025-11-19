import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Sub-10ms Policy Enforcement',
    icon: '⚡',
    description: (
      <>
        Real-time AI governance without latency impact. Deploy In-VPC for P95 sub-10ms
        policy evaluation on every LLM request.
      </>
    ),
  },
  {
    title: 'Multi-Agent Orchestration',
    icon: '🤖',
    description: (
      <>
        Coordinate 10-100+ AI agents in parallel with MAP (Multi-Agent Planning).
        Achieve 40x faster completion times with intelligent task decomposition.
      </>
    ),
  },
  {
    title: 'Production-Ready Deployment',
    icon: '🚀',
    description: (
      <>
        One-click AWS Marketplace deployment with CloudFormation. In-VPC architecture
        with ECS/Fargate, RDS PostgreSQL, and auto-scaling built-in.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
