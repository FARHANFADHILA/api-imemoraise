import { PrismaClient } from "@prisma/client";
import { IDGenerator } from "../services/dosen.services";
import { Request, Response } from "express";

const prisma = new PrismaClient();

const getInfoDosenByEmail = async (req: Request, res: Response) => {
	const { email } = req.params;
	try {
		// Mengambil data nama, dan nim mahasiswa berdasarkan email
		const result = await prisma.dosen.findFirst({
			where: {
				email: email,
			},
			select: {
				nama: true,
				nip: true,
			},
		});
		res.status(200).json({
			response: true,
			message: "data mahasiswa",
			data: result,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			response: false,
			message: "internal server error",
		});
	}
};

const postSetoran = async (req: Request, res: Response) => {
	const { nim, nip, nomor_surah, tgl_setoran } = req.body;

	// Validasi input
	if (!nim || !nip || !nomor_surah) {
		return res.status(400).json({
			response: false,
			message: "Waduh, lengkapi dulu datanya mas!",
		});
	}

	// Convert nomor_surah to integer if it is a string, and returns err if not
	const nomorSurahInt = parseInt(nomor_surah as string, 10);
	if (isNaN(nomorSurahInt)) {
		return res.status(400).json({
			response: false,
			message: "Waduh, nomor surahnya salah format mas!",
		});
	}

	try {
		// Periksa apakah kombinasi nim, nip, dan nomor_surah sudah ada (antisipasi duplikasi setoran di 1 mhs)
		const existingSetoran = await prisma.setoran.findFirst({
			where: {
				AND: [
					{ nim: nim as string },
					{ nip: nip as string },
					{ nomor_surah: nomorSurahInt },
				],
			},
		});
		if (existingSetoran) {
			return res.status(409).json({
				response: false,
				message: "Maaf, mahasiswa ybs telah menyetor surah tersebut!",
			});
		}

		// Generate ID setoran baru format SH240001 ++
		const idSetoran = await IDGenerator.generateNewId();

		// Simpan data ke database mas
		await prisma.setoran.create({
			data: {
				id: idSetoran,
				tgl_setoran: tgl_setoran ? new Date(tgl_setoran) : new Date(),
				tgl_validasi: new Date(),
				nim: nim as string,
				nip: nip as string,
				nomor_surah: nomorSurahInt,
			},
		});

		// Kirim respons sukses
		res.status(201).json({
			response: true,
			message: "Yeay, proses validasi setoran berhasil! ✨",
		});

	} catch (error) {
		res.status(500).json({
			response: false,
			message: "Oops! ada kesalahan di server kami 😭",
		});
	}
};

const findMahasiswaByNameOrNim = async (req: Request, res: Response) => {
	const { search, nip, angkatan } = req.query;

	try {
		const result = await prisma.$queryRaw`
			SELECT 
				nim, nama
			FROM 
				mahasiswa 
			WHERE 
				CONCAT('20', SUBSTRING(nim, 2, 2)) = ${angkatan}
				AND nip = ${nip}
				AND (LOWER(nama) LIKE ${`%${search}%`} OR LOWER(nim) LIKE ${`%${search}%`});
		`;

		res.status(200).json({
			response: true,
			message: "Berikut list data mahasiswa yang sesuai!",
			data: result,
		});
	} catch (error) {
		res.status(500).json({
			response: false,
			message: "Oops! ada kesalahan di server kami 😭",
		});
	}
};

const getInfoMahasiswaPAPerAngkatanByNIP = async (req: Request, res: Response) => {
	const { nip } = req.params;

	const result = await prisma.mahasiswa.groupBy({
		by: ["nim"],
		_count: {
			nim: true,
		},
		orderBy: {
			nim: "desc",
		},
		where: {
			nip: nip,
		},
		take: 8,
	});

	// Langkah 2: Mengelompokkan hasil berdasarkan tahun dan menghitung jumlah
	const groupedResult = result.reduce((acc, item) => {
		const tahun = `20${item.nim.slice(1, 3)}`;

		if (acc[tahun]) {
			acc[tahun] += item._count.nim;
		} else {
			acc[tahun] = item._count.nim;
		}

		return acc;
	}, {} as Record<string, number>);

	// Langkah 3: Mengonversi objek menjadi array dan mengurutkannya
	const formattedResult = Object.keys(groupedResult)
		.map((tahun) => ({
			tahun,
			jumlah: groupedResult[tahun],
		}))
		.sort((a, b) => b.tahun.localeCompare(a.tahun)); // Mengurutkan tahun secara menurun

	res.status(200).json({
		response: true,
		message: "list detail mahasiswa berdasar nim individu",
		data: formattedResult,
	});
};

export {
  getInfoDosenByEmail,
	getInfoMahasiswaPAPerAngkatanByNIP,
	findMahasiswaByNameOrNim,
	postSetoran,
};
