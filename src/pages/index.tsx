import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import Prismic from '@prismicio/client';
import { FiCalendar, FiUser } from 'react-icons/fi';

import { useState } from 'react';

import { formatDate } from '../util/format';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { next_page, results } = postsPagination;

  const [urlNextPage, setUrlNextPage] = useState(next_page);
  const [posts, setPosts] = useState<Post[]>(results);

  async function handleLoadMorePosts(): Promise<void> {
    await fetch(urlNextPage)
      .then(response => response.json())
      .then(data => {
        setUrlNextPage(data.next_page);

        const newPosts = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        setPosts([...posts, ...newPosts]);
      });
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling.</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts?.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <h1>{post.data.title}</h1>
                <p>{post.data.subtitle}</p>
                <div className={commonStyles.informationsPost}>
                  <time>
                    <FiCalendar size={20} />{' '}
                    {formatDate(post.first_publication_date)}
                  </time>
                  <span>
                    <FiUser size={20} /> {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}
          {urlNextPage && (
            <button
              type="button"
              className={styles.loadMorePosts}
              onClick={() => handleLoadMorePosts()}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const response = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [
        'posts.uid',
        'posts.title',
        'posts.subtitle',
        'posts.author',
        'posts.first_publication_date',
      ],
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
    }
  );

  const listPosts = response.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const next_page = response ? response.next_page : null;

  return {
    props: {
      postsPagination: {
        next_page,
        results: listPosts,
      },
    },
  };
};
