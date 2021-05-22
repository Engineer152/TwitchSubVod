import React, { useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga';
import { FiSearch } from 'react-icons/fi';
import { useRouter } from 'next/router';
import api from '@/utils/services/api';
import apiV2 from '@/utils/services/apiV2';
import { useGlobal } from '@/stores/GlobalContext';
import { Container } from './styles';
import QualitySelection from '../QualitySelection';
import ErrorModal from '../ErrorModal';
import LoadingModal from '../LoadingModal';

interface AutoCompleteProps {
  display_name: string;
}

const SearchInput = (): any => {
  const router = useRouter();
  const inputRef = useRef<any>();
  const {
    setVideoQuality,
    error,
    setError,
    loading,
    setLoading,
    setVodUrl,
  } = useGlobal();
  const [username, setUsername] = useState('');
  const [autoComplete, setAutoComplete] = useState<Array<AutoCompleteProps>>(
    [],
  );

  useEffect(() => {
    !!username.length &&
      apiV2
        .get(`search/channels?query=${username}&first=3`)
        .then((response) => {
          setAutoComplete(response.data.data);
        })
        .catch((error) => console.warn(error));
  }, [username]);

  const handleSubmit = () => {
    if (username) {
      setLoading(true);
      router.prefetch(`/videos/${username}`);
      try {
        setError('');
        api
          .get(`users?login=${username}`)
          .then((response) => {
            try {
              api
                .get(`channels/${response.data.users[0]._id}/videos?limit=1`)
                .then((channelResponse: any) => {
                  if (channelResponse.data.videos.length !== 0) {
                    router.push(`/videos/${username}`, undefined, {
                      scroll: false,
                    });
                    setVodUrl('');
                    inputRef.current?.blur();
                    window.scrollTo({ behavior: 'smooth', top: 340 });
                  }
                  if (channelResponse.data._total === 0) {
                    setError(`${username} does not have any available streams`);
                  }
                })
                .finally(() => {
                  setLoading(false);
                });

              ReactGA.event({
                category: 'SearchedUserForDeletedVod',
                action: `${username}`,
              });
            } catch (err) {
              setError('This user does not exist or is unavailable');
            }
          })
          .catch((err) => setError(err.response.data.message))
          .finally(() => {
            setLoading(false);
          });
      } catch (err) {
        console.warn(err);
        setLoading(false);
        setError('Something went wrong');
      }
    } else {
      setError('Enter a streamer username');
    }
  };

  return (
    <Container
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        name="username"
        aria-label="username"
        onChange={(event) => setUsername(event.target.value)}
        value={username}
        placeholder="Streamer Username"
        list="streamer-username"
        autoComplete="off"
      />

      <datalist id="streamer-username">
        {!!username &&
          !!autoComplete.length &&
          autoComplete.map((user: { display_name: string }) => (
            <option key={user.display_name} value={user.display_name} />
          ))}
      </datalist>
      <QualitySelection
        onChange={(event: any) => setVideoQuality(event.target.value)}
      />
      <button type="submit" aria-label="submit">
        <FiSearch size={14} />
        Search
      </button>
      {loading && <LoadingModal />}
      {error && <ErrorModal message={error} />}
    </Container>
  );
};

export default SearchInput;
