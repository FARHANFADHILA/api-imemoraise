import express from "express";
import cors from "cors";

import mahasiswaRoutes from "./src/routes/mahasiswa.routes";
import dosenRoutes from "./src/routes/dosen.routes";

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use(dosenRoutes);
app.use(mahasiswaRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
