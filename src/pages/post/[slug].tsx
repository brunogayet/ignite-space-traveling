import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { formatDate } from '../../util/format';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  // Counting words
  const readingTime = post.data.content.reduce(
    (acc, element) => {
      if (element.heading) {
        acc.totalWords += element.heading.split(/\s+/).length;
      }

      if (element.body) {
        acc.totalWords += RichText.asText(element.body).split(/\s+/).length;
      }

      return acc;
    },
    {
      totalWords: 0,
    }
  );

  const readingAvgPerMinute = 200;

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling.</title>
      </Head>

      <Header />

      <div
        className={styles.banner}
        style={{
          background: `url(${post.data.banner.url}) center / cover no-repeat`,
        }}
      />

      <main className={commonStyles.container}>
        <article className={styles.postContainer}>
          <h1>{post.data.title}</h1>

          <div
            className={`${commonStyles.informationsPost} ${styles.informationsPost}`}
          >
            <time>
              <FiCalendar size={20} /> {post.first_publication_date}
            </time>
            <span>
              <FiUser size={20} /> {post.data.author}
            </span>
            <span>
              <FiClock size={20} />{' '}
              {Math.ceil(readingTime.totalWords / readingAvgPerMinute)} min
            </span>
          </div>

          <div className={styles.content}>
            {post.data.content.map(element => (
              <section key={element.heading} className={styles.elementContent}>
                <h2>{element.heading}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(element.body),
                  }}
                />
              </section>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.uid'],
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    first_publication_date: formatDate(response.first_publication_date),
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
  };
};
