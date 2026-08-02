import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Credenciais da Conta de Serviço (Poder de Admin)
const serviceAccount = {
  type: "service_account",
  project_id: "duoelo-987fd",
  private_key_id: "20c73d4416f9b12b859d6b298974725994fb4441",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDLDF9tKV46ZQQ6\nUmQp8246ms6H0ZGxttBaA0o4iGIBiSxVlrUWb+KMw0gcjiwqmm181WfCKTLD+94t\nrpoafXxWVhNzYAFTpWsFaXiTNPR12WcGjz2yk7V9VdYzdpl/Kr+UBbFO3jwGhglC\nGKY8GZoA2sXehqy+E6MaUnk4IjWBz1l7D4knouD/ENSw3Bk9FWx197bAcsXYEYIn\ns3Cd899VB68CFOdozlCIQTj3dFp5AaC08T0rt/9RgotUdmN0Gkd47jD5aK8H22ZO\nKOinnoKiiU6l65gPt3yUYZRZKjGWODPFEtWgZtkIvRhJgJGwVy09mNUgAqyFuMoC\n9m7VwNghAgMBAAECggEACe6gQVj3bsBPuWGb3DB36R528U5XQ9vnK6wDBqpnLt+M\nn2AomgEdkhigT6NFtkzJA8T1lxoITW1l1BK5H4gZW6jIuUlOL08FYeWjnAHIXnZk\ns32wvSo8A7Y97NUFk6Kd7ensXykAQyptzAGkKgbvkVCiQq0QSJjxzsEPhGcp+mA5\nhcnjUTM8gz/xVOP6e9XAVqRXReEIF0WBCu1OUPlI2S1da56jQ7b7qj6W1GyBJGEo\n1L22xas3QTbYXOG5rAMAwt0ToAa2fT1L5ZnMf7WIYXHDwknGDXxyT2yYW+ODERqQ\nO9Jmyi3xOXg2P0ppLmZFLWaSWk0QYlN4T9EEbbNtVQKBgQD3NksVSpeLV1H18Q8T\nohqMhwPtCUz8i9S3+5e6MHLtMzaxwXTQNV1Ihq0lUzEGQyLY7L2uXcVZfe3jESrL\nHwlcl/MEyL2OyKkP0ym5xIkwvvylhR7FRJ4RwYcNlK/xwrXQut2zUwh0ohsJo5lI\nvl+tRAwrnhHeJxT0X5z/P7MIHQKBgQDSRCz00x4p6jrNCM4M08yQZ6QeL6ByxN+D\nIB809UBvnBRhX69VHxkopjjlBj1+gPOBnbbSJyDpJq7xogSeSFrc3+qA48J2ecna\nynp0JFfu2UGeheA4pkkWgWhUODhKmPvr5zMb087/Xpey0BhRr0VBCMMfvsxG5uMH\nqk9+gHv41QKBgQCcv+Vd670pkkWa763Coi+5WUbo/tO88qD/w9zSJzRIKQgOL/90\nodGzUgnpt9VHBjzLVVl0fWrMMugq6VC8GMLj3kkuiGaBacShDyDO9MqUiRVDkqQP\nK1IbKh4LQ3NIlVCZuFMpCIY9BiiktQJVuLiL8bDR21mzBg7oYNP4mRhZFQKBgE99\nhqFnztd5vZEV6w/eYk+VXu4qgzXgR7+CvUmADkQjdXD6g4Zio1hCvu+WVFkm1ugB\nf8QjFsYN4cVnwucz42XtIPJpKHMxx6X3NiQCOVwKtkv/wKyp8KeZdJ+iQWWyQEsG\ntMOoZ3ETibYIBamb4UqczWeK8h872khjknn4iOWhAoGBALwSpdS3OFsPS8oD1gHQ\nfbq1ueINZ6I8Y9QpgZHWRI1hBlzk1P4yTYsAzCymmV0cA6UzhHupO4kbV/jwRgis\nIpS4oPeSpA7a9Jg2hSXpxBQqHlHuaUUiCFULaZtCaINcZf3q1ww5jInikS++yEl/\nqLHxYq0LyBhuo95nOARVcmdi\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@duoelo-987fd.iam.gserviceaccount.com",
  client_id: "112628044393132384360",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40duoelo-987fd.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

// Inicializa o Firebase Admin usando a API Modular correta
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function runSeed() {
  console.log("⏳ Conectando ao Firestore para inserir o Curso DuoElo...");

  // Criamos apenas o curso principal DuoElo, englobando todos os 9 módulos clínicos
  const courses = [
    {
      id: "curso_duoelo",
      title: {
        pt: "DuoElo",
        en: "DuoElo",
        es: "DuoElo",
        fr: "DuoElo",
        de: "DuoElo",
        ja: "DuoElo",
      },
      description: {
        pt: "A jornada oficial do DuoElo para blindar o seu relacionamento com 5 minutos diários.",
        en: "The official DuoElo journey to shield your relationship with 5 minutes a day.",
        es: "El viaje oficial de DuoElo para blindar tu relación con 5 minutos diarios.",
        fr: "Le parcours officiel DuoElo pour protéger votre relation avec 5 minutes par jour.",
        de: "Die offizielle DuoElo-Reise, um Ihre Beziehung mit 5 Minuten täglich zu schützen.",
        ja: "1日5分で関係を守るための公式DuoEloの道のり。",
      },
      moduleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      icon: "shield", // Ícone que representa "Blindagem" no app
    },
  ];

  try {
    for (const course of courses) {
      // Injeta o curso direto na coleção 'courses' do Firestore
      await db.collection("courses").doc(course.id).set(course);
      console.log(
        `✅ Curso [${course.title.pt}] inserido com sucesso na base de dados!`,
      );
    }
    console.log("🎉 Tabela finalizada perfeitamente!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao popular o banco:", error);
    process.exit(1);
  }
}

runSeed();
