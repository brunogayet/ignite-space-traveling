import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDate, formatDateTime } from '../../util/format';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';

import styles from './post.module.scss';
import { Comment } from '../../components/Comment';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
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

interface PrevNextPosts {
  uid: string;
  title: string;
}

interface PostProps {
  post: Post;
  prevPost: PrevNextPosts;
  nextPost: PrevNextPosts;
  preview: boolean;
}

export default function Post({
  post,
  prevPost,
  nextPost,
  preview,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <div className={commonStyles.loading}>
        <span>Carregando...</span>
      </div>
    );
  }

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

      <div
        className={styles.banner}
        style={{
          background: `url(${post.data.banner.url}) center / cover no-repeat`,
        }}
      />

      <main className={`${commonStyles.container} ${styles.container}`}>
        <article className={styles.postContainer}>
          <h1>{post.data.title}</h1>

          <div
            className={`${commonStyles.informationsPost} ${styles.informationsPost}`}
          >
            <time>
              <FiCalendar size={20} /> {formatDate(post.first_publication_date)}
            </time>
            <span>
              <FiUser size={20} /> {post.data.author}
            </span>
            <span>
              <FiClock size={20} />{' '}
              {Math.ceil(readingTime.totalWords / readingAvgPerMinute)} min
            </span>
          </div>

          {post.first_publication_date !== post.last_publication_date && (
            <div className={styles.lastPublicationDate}>
              * editado em {formatDateTime(post.last_publication_date)}
            </div>
          )}

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

      <footer className={commonStyles.footer}>
        <div className={styles.linkPosts}>
          <div className={styles.prevPost}>
            {prevPost && (
              <div>
                <div>{prevPost.title}</div>
                <span>
                  <Link href={`/post/${prevPost.uid}`}>Post anterior</Link>
                </span>
              </div>
            )}
          </div>

          <div className={styles.nextPost}>
            {nextPost && (
              <div>
                <div>{nextPost.title}</div>
                <span>
                  <Link href={`/post/${nextPost.uid}`}>Pŕoximo post</Link>
                </span>
              </div>
            )}
          </div>
        </div>

        <Comment post={post.uid} />

        {preview && (
          <Link href="/api/exit-preview">
            <aside className={commonStyles.previewMode}>
              <a>Sair do modo Preview</a>
            </aside>
          </Link>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.uid'],
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = null,
  previewData = {},
}) => {
  const { ref } = previewData;
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID(
    'posts',
    String(slug),
    ref ? { ref } : null
  );

  const prevPostResponse = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPostResponse = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  let prevPost: PrevNextPosts = null;

  const prevPostResult = prevPostResponse?.results[0] || null;

  if (prevPostResult) {
    prevPost = {
      uid: prevPostResult.uid,
      title: prevPostResult.data.title,
    };
  }

  let nextPost: PrevNextPosts = null;

  const nextPostResult = nextPostResponse?.results[0] || null;

  if (nextPostResult) {
    nextPost = {
      uid: nextPostResult.uid,
      title: nextPostResult.data.title,
    };
  }

  return {
    props: {
      post,
      prevPost,
      nextPost,
      preview,
    },
    redirect: 60 * 60 * 24, // 24 hours
  };
};
