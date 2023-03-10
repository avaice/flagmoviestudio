import Head from "next/head"
import styles from "@/styles/trim.module.css"
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg"
import { useRef, useState } from "react"
export default function Home() {
  const ffmpeg = createFFmpeg({
    corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isTrimming, setIsTrimming] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File>()
  const [trimOption, setTrimOption] = useState({
    from: 0,
    to: 0,
  })
  const [progress, setProgress] = useState(0)

  ffmpeg.setProgress(({ ratio }) => {
    setProgress(ratio)
  })

  const onSelectedFile = async ({
    target: { files },
  }: {
    target: EventTarget & HTMLInputElement
  }) => {
    if (!files || !files[0] || !videoRef.current) {
      return alert("動画読み込みに失敗しました！")
    }
    setSelectedFile(files[0])
    videoRef.current.src = URL.createObjectURL(files[0])
  }

  const processFile = async () => {
    if (!selectedFile) {
      return alert("動画を最初に選択してください！")
    }
    if (trimOption.from === trimOption.to) {
      return alert("始点と終点が同じになっているため動画を切り抜きできません！")
    }
    if (trimOption.from > trimOption.to) {
      return alert("始点が終点より後になっているため動画を切り抜きできません！")
    }
    const { name } = selectedFile

    setIsTrimming(true)
    await ffmpeg.load()
    ffmpeg.FS("writeFile", name, await fetchFile(selectedFile))
    await ffmpeg.run(
      "-ss",
      trimOption.from.toString(),
      "-i",
      name,
      "-ss",
      "0",
      "-t",
      (trimOption.to - trimOption.from).toString(),
      "-c",
      "copy",
      "Converted_" + selectedFile.name
    )
    const data = ffmpeg.FS("readFile", "Converted_" + selectedFile.name)
    setIsTrimming(false)
    setDownloadUrl(
      URL.createObjectURL(new Blob([data.buffer], { type: selectedFile.type }))
    )
    dialogRef.current?.showModal()
  }

  return (
    <>
      <Head>
        <title>動画切り抜きくん</title>
        <meta
          name="description"
          content="高速に動画から一部分を切り取ることができるWebアプリ"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@_avaice" />
        <meta name="twitter:title" content="動画切り抜きくん" />
        <meta
          name="twitter:description"
          content="高速に動画から一部分を切り取ることができるWebアプリ"
        />
      </Head>
      <header>
        <h1>動画切り抜きくん</h1>
        <p>
          ブラウザだけで動画を切り抜くことができます！
          <br />
          編集する動画はサーバーにはアップロードされず、ブラウザによって処理されます。
        </p>
        <p>
          {" "}
          <a
            href="http://twitter.com/share?url=https://flagmoviestudio.cho-ice.xyz/&text=動画切り抜きくん&via=_avaice&related=_avaice&hashtags=#flagmoviestudio"
            target="_blank"
            rel="noreferrer"
          >
            Twitterでシェアする
          </a>
        </p>
      </header>
      <main>
        <div className={styles.alertBadge}>
          <p>注意：携帯端末では動作しない可能性があります</p>
        </div>
        <div className={styles.preview}>
          {!selectedFile && (
            <button
              onClick={() => {
                document.getElementById("videoFileInput")?.click()
              }}
            >
              ここをクリックして動画を選択！
            </button>
          )}
          <video
            ref={videoRef}
            controls
            style={{ display: selectedFile ? "block" : "none" }}
          ></video>
          <input
            type="file"
            onChange={onSelectedFile}
            id="videoFileInput"
          ></input>
        </div>
        <p>
          From: {Math.floor(trimOption.from / 60)}:
          {Math.floor(trimOption.from % 60)}, To:{" "}
          {Math.floor(trimOption.to / 60)}:{Math.floor(trimOption.to % 60)}{" "}
          (Duration: {Math.round(trimOption.to - trimOption.from)}
          s)
        </p>
        <div className={styles.trimControls}>
          <button
            onClick={() => {
              setTrimOption({
                ...trimOption,
                from: videoRef.current?.currentTime ?? 0,
              })
            }}
          >
            現在位置を始点に設定
          </button>
          <button
            onClick={() => {
              setTrimOption({
                ...trimOption,
                to: videoRef.current?.currentTime ?? 0,
              })
            }}
          >
            現在位置を終点に設定
          </button>
        </div>
        <button className={styles.trimButton} onClick={processFile}>
          切り抜き
        </button>
        <button
          className={styles.newButton}
          onClick={() => {
            setTrimOption({ from: 0, to: 0 })
            setSelectedFile(undefined)
            if (videoRef.current) {
              videoRef.current.src = ""
            }
          }}
        >
          最初からやり直す
        </button>

        {progress > 0 && progress !== 1 && (
          <p className={styles.progress}>
            変換状況: {Math.ceil(progress * 100)}%
          </p>
        )}

        {isTrimming && (
          <div className={styles.wrapper}>
            {progress > 0 && progress !== 1 ? (
              <p className={styles.progress}>
                変換状況: {Math.ceil(progress * 100)}%
              </p>
            ) : (
              <p className={styles.progress}>変換中...</p>
            )}
          </div>
        )}

        <div className={downloadUrl !== "" ? styles.wrapper : ""}>
          <dialog
            ref={dialogRef}
            className={styles.result}
            id="resultDialog"
            // ごめんなさい
            onClick={(e: any) => {
              if (e.target.id === "resultDialog") {
                dialogRef.current?.close()
                setDownloadUrl("")
              }
            }}
          >
            <form method="dialog">
              <h2>Result</h2>
              <video src={downloadUrl} controls></video>

              <p>動画を右クリック→名前を付けて動画を保存 から保存できます</p>
              <p>
                または、<a href={downloadUrl}>ここ</a>
                を右クリックすると保存メニューが出てきます
              </p>

              <button value="default" onClick={() => setDownloadUrl("")}>
                閉じる
              </button>
            </form>
          </dialog>
        </div>
      </main>
      <footer>
        <p>
          開発:{" "}
          <a
            href="https://twitter.com/_avaice"
            target={"_blank"}
            rel="noreferrer"
          >
            @_avaice
          </a>
        </p>
        <p>
          <a
            href="https://github.com/avaice/flagmoviestudio"
            target={"_blank"}
            rel="noreferrer"
          >
            View on GitHub!
          </a>
        </p>
      </footer>
    </>
  )
}
