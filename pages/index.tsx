import Head from 'next/head';
import Image from 'next/image';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAsset, useUpdateAsset, useCreateAsset, Player } from '@livepeer/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDropzone } from 'react-dropzone';
import BarLoader from 'react-spinners/BarLoader';
import PulseLoader from 'react-spinners/PulseLoader';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import styles from '../styles/MintNFT.module.css';
import Link from 'next/link';
import titleImage from '../public/titleImage.png'



import { videoNftAbi } from '../components/videoNftAbi';

export default function Home() {
  const [video, setVideo] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [description, setDescription] = useState<string>();
  const [isWriteInProgress, setIsWriteInProgress] = useState<boolean>();
  const [ isUpdateAsset, setIsUpdateAsset ] = useState<boolean>();
  const [ isFileSelected, setIsFileSelected ] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const { address } = useAccount();

  // Creating an asset

  const {
    mutate: createAsset,
    data: createdAsset,
    status: createStatus,
    progress,
  } = useCreateAsset(
    video
      ? {
          sources: [{ name: assetName, file: video }] as const,
        }
      : null
  );

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0 && acceptedFiles?.[0]) {
      setVideo( acceptedFiles[ 0 ] );
      setIsFileSelected( true );
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'video/*': ['*.mp4'],
    },
    maxFiles: 1,
    onDrop,
  });

  const {
    data: asset,
    error,
    status: assetStatus,
  } = useAsset({
    assetId: createdAsset?.[0].id,
    refetchInterval: (asset) => (asset?.storage?.status?.phase !== 'ready' ? 5000 : false),
  });

  const { mutate: updateAsset, status: updateStatus } = useUpdateAsset(
    asset
      ? {
          name: assetName,
          assetId: asset.id,
          storage: {
            ipfs: true,
            metadata: {
              description,
            },
          },
        }
      : undefined
  );

  const progressFormatted = useMemo(
    () =>
      progress?.[0].phase === 'failed'
        ? 'Failed to process video.'
        : progress?.[0].phase === 'waiting'
        ? 'Waiting'
        : progress?.[0].phase === 'uploading'
        ? `Uploading: ${Math.round(progress?.[0]?.progress * 100)}%`
        : progress?.[0].phase === 'processing'
        ? `Processing: ${Math.round(progress?.[0].progress * 100)}%`
        : null,
    [progress]
  );

  const { config } = usePrepareContractWrite({
    // The demo NFT contract address on Polygon Mumbai
    address: '0xA4E1d8FE768d471B048F9d73ff90ED8fcCC03643',
    abi: videoNftAbi,
    // Function on the contract
    functionName: 'mint',
    // Arguments for the mint function
    args:
      address && asset?.storage?.ipfs?.nftMetadata?.url
        ? [address, asset?.storage?.ipfs?.nftMetadata?.url]
        : undefined,
    enabled: Boolean(address && asset?.storage?.ipfs?.nftMetadata?.url),
  });

  const {
    data: contractWriteData,
    isSuccess,
    isLoading: isContractWriteLoading,
    write,
    error: contractWriteError,
  } = useContractWrite(config);

  const isLoading = useMemo(
    () =>
      createStatus === 'loading' ||
      assetStatus === 'loading' ||
      updateStatus === 'loading' ||
      (asset && asset?.status?.phase !== 'ready') ||
      (asset?.storage && asset?.storage?.status?.phase !== 'ready') ||
      isContractWriteLoading,
    [asset, assetStatus, updateStatus, isContractWriteLoading, createStatus]
  );

  // Runs after an asset is created
  useEffect(() => {
    if (!isUpdateAsset && updateAsset && updateStatus === 'idle') {
      setIsUploadingToIPFS( true );
      setIsFileSelected(false)
      // console.log('updateAsset', updateStatus);
      setIsUpdateAsset(true);
      updateAsset();
    }
  }, [updateAsset, updateStatus, isUpdateAsset]);

  // Runs after an asset is uploaded to IPFS
  useEffect(() => {
    if (!isWriteInProgress && asset?.storage?.status?.phase === 'ready' && write) {
      // console.log('assetPhase', asset?.storage?.status?.phase);
      setIsWriteInProgress(true);
      write();
    }
  }, [write, asset?.storage?.status?.phase, isWriteInProgress]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Livepeer Sample App</title>
        <meta name='description' content='Livepeer Studio Mint NFT App' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      {/* Wallet Connect Button */}
      <div className='flex justify-between mt-10'>
        <Link href='https://www.livepeer.studio'>
          <Image src='/studio-logo.png' alt='Livepeer logo' width={180} height={50} />
        </Link>
        <ConnectButton />
      </div>

      {/* Social */}
      <div className='flex mt-6 ml-2'>
        <Link
          href='https://discord.com/channels/423160867534929930/1044996697090162698'
          className='text-blue-600 mr-2 text-lg hover:text-white'
        >
          Tutorials
        </Link>
        <Link
          href='https://discord.com/channels/423160867534929930/1044996697090162698'
          className='text-blue-600 mr-2 text-lg hover:text-white'
        >
          FAQs
        </Link>
        <Link
          href='https://discord.com/channels/423160867534929930/1044996697090162698'
          className='text-blue-600 text-lg hover:text-white'
        >
          Support
        </Link>
      </div>
      {/* Main page */}
      <div className='flex justify-center'>
          <Image src={titleImage} alt='title image' width={1000} height={500} />
      </div>
      <div className='flex justify-center text-center'>
        <div className='overflow-auto border border-solid border-blue-600 rounded-md p-6 w-3/5'>
          {address ? (
            <div>
              {asset?.status?.phase !== 'ready' && (
                <div className={styles.drop} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <div>
                    <p className='text-center'>
                      Drag and drop or <span>browse files</span>
                    </p>
                  </div>
                </div>
              )}

              {asset?.storage?.ipfs?.cid ? (
                <div className='flex flex-col justify-center items-center ml-5'>
                  <div className='border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5'>
                    <Player playbackId={asset?.storage?.ipfs?.cid} />
                  </div>
                  <div className='items-center'>
                    {contractWriteData?.hash && isSuccess ? (
                      <div className='flex'>
                        <a
                          target='_blank'
                          href={`https://mumbai.polygonscan.com/tx/${contractWriteData.hash}`}
                          rel='noreferrer'
                        >
                          <button className=' bg-blue-600 rounded p-3 text-white hover:text-gray-800 mt-5 mr-5'>
                            View Transaction
                          </button>
                        </a>

                        <a href='https://twitter.com/intent/tweet?text=Video%20NFT%20created%20on%20Livepeer%20Studio%20app'>
                          <button className=' bg-blue-600 rounded p-3 pb-2 text-white hover:text-gray-800 mt-5'>
                            <span className='flex'>
                              <Image
                                src='/icons8-twitter-48.png'
                                alt='Twitter logo'
                                width={30}
                                height={10}
                              />
                              Share
                            </span>{' '}
                          </button>
                        </a>
                      </div>
                    ) : contractWriteError ? (
                      <p>{contractWriteError.message}</p>
                    ) : (
                      <></>
                    )}
                  </div>
                  <div className='border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5'>
                    <p className='text-left text-blue-600'>CID: {asset?.storage?.ipfs?.cid}</p>
                    <p className='text-left text-blue-600'>URL: {asset?.storage?.ipfs?.url}</p>
                    <p className='text-left text-blue-600'>
                      Gateway URL: {asset?.storage?.ipfs?.gatewayUrl}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    {isUploadingToIPFS && (
                      <p className='text-2xl text-indigo-500'>
                        Storing to IPFS
                        <span>
                          <br />
                          <PulseLoader size={7} color='#245cd8' />
                        </span>
                      </p>
                    )}
                  </div>
                  <div className={styles.progress}>
                    {video && isFileSelected && (
                      <p className='text-2xl text-yellow-600'>File Selected</p>
                    )}
                    {video ? (
                      <p className='text-xl text-cyan-400'>{progressFormatted}</p>
                    ) : asset?.storage?.status ? (
                      <p className='text-xl text-green-300'>{asset?.storage?.status?.progress}</p>
                    ) : (
                      <p>Select a video file to upload.</p>
                    )}
                  </div>
                  <div className={styles.form}>
                    <label htmlFor='asset-name' className='text-left'>
                      Name:{' '}
                    </label>
                    <input
                      className='rounded bg-slate-700'
                      type='text'
                      value={assetName}
                      name='asset-name'
                      required
                      disabled={disabled}
                      onChange={(e) => setAssetName(e.target.value)}
                    />
                    <br />
                    <label htmlFor='description' className='text-left'>
                      Description:{' '}
                    </label>
                    <textarea
                      className='rounded bg-slate-700 mb-5'
                      value={description}
                      name='description'
                      disabled={disabled}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {/* Upload Asset */}
                  <div className='flex justify-center'>
                    {asset?.status?.phase !== 'ready' ? (
                      <button
                        className=' bg-blue-600 rounded p-3'
                        onClick={() => {
                          if (video) {
                            setDisabled(true), createAsset?.();
                          }
                        }}
                        disabled={!video || isLoading || Boolean(asset)}
                      >
                        Create NFT
                        <br />
                        {isLoading && <BarLoader color='#fff' />}
                      </button>
                    ) : (
                      <></>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p>Please connect your wallet</p>
          )}
        </div>
      </div>
    </div>
  );
}
