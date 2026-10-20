import { execFile } from "child_process";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "video";
}

async function runYtDlp(url: string, outputTemplate: string) {
  const candidates = [
    process.env.PYTHON_BIN,
    "python3",
    "python",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
    "/opt/homebrew/bin/python3",
  ].filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const binary of candidates) {
    try {
      return await execFileAsync(
        binary,
        [
          "-m",
          "yt_dlp",
          "--no-playlist",
          "--no-check-certificate",
          "--restrict-filenames",
          "--merge-output-format",
          "mp4",
          "-f",
          "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          "-o",
          outputTemplate,
          url,
        ],
        {
          timeout: 10 * 60 * 1000,
          maxBuffer: 50 * 1024 * 1024,
        },
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Não foi possível executar o downloader do vídeo.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body.url ?? "").trim();
    const title = String(body.title ?? "").trim();
    const artist = String(body.artist ?? "").trim();

    if (!url) {
      return NextResponse.json({ error: "URL do vídeo é obrigatória." }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), "public", "downloads");
    await mkdir(downloadDir, { recursive: true });

    const prefix = slugify(`${title || artist || "video"}-${Date.now()}`);
    const outputTemplate = path.join(downloadDir, `${prefix}.%(ext)s`);

    const filesBefore = new Set(await readdir(downloadDir));
    await runYtDlp(url, outputTemplate);

    const filesAfter = await readdir(downloadDir);
    const finalFile = filesAfter.find((file) => {
      if (!file.startsWith(prefix)) return false;
      if (filesBefore.has(file)) return false;
      return /\.(mp4|m4v|webm|mov|mkv)$/i.test(file);
    });

    if (!finalFile) {
      return NextResponse.json({ error: "Não foi possível localizar o arquivo baixado." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      downloadUrl: `/downloads/${finalFile}`,
      fileName: finalFile,
    });
  } catch (error) {
    console.error("Erro ao baixar vídeo:", error);
    return NextResponse.json({ error: "Não foi possível baixar o vídeo solicitado." }, { status: 500 });
  }
}
