import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Voltamos para o formato direto (sem precisar ler arquivos externos)
const serviceAccount = {
  type: "service_account",
  project_id: "duoelo-987fd",
  private_key_id: "20c73d4416f9b12b859d6b298974725994fb4441",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDLDF9tKV46ZQQ6\nUmQp8246ms6H0ZGxttBaA0o4iGIBiSxVlrUWb+KMw0gcjiwqmm181WfCKTLD+94t\nrpoafXxWVhNzYAFTpWsFaXiTNPR12WcGjz2yk7V9VdYzdpl/Kr+UBbFO3jwGhglC\nGKY8GZoA2sXehqy+E6MaUnk4IjWBz1l7D4knouD/ENSw3Bk9FWx197bAcsXYEYIn\ns3Cd899VB68CFOdozlCIQTj3dFp5AaC08T0rt/9RgotUdmN0Gkd47jD5aK8H22ZO\nKOinnoKiiU6l65gPt3yUYZRZKjGWODPFEtWgZtkIvRhJgJGwVy09mNUgAqyFuMoC\n9m7VwNghAgMBAAECggEACe6gQVj3bsBPuWGb3DB36R528U5XQ9vnK6wDBqpnLt+M\nn2AomgEdkhigT6NFtkzJA8T1lxoITW1l1BK5H4gZW6jIuUlOL08FYeWjnAHIXnZk\ns32wvSo8A7Y97NUFk6Kd7ensXykAQyptzAGkKgbvkVCiQq0QSJjxzsEPhGcp+mA5\nhcnjUTM8gz/xVOP6e9XAVqRXReEIF0WBCu1OUPlI2S1da56jQ7b7qj6W1GyBJGEo\n1L22xas3QTbYXOG5rAMAwt0ToAa2fT1L5ZnMf7WIYXHDwknGDXxyT2yYW+ODERqQ\nO9Jmyi3xOXg2P0ppLmZFLWaSWk0QYlN4T9EEbbNtVQKBgQD3NksVSpeLV1H18Q8T\nohqMhwPtCUz8i9S3+5e6MHLtMzaxwXTQNV1Ihq0lUzEGQyLY7L2uXcVZfe3jESrL\nHwlcl/MEyL2OyKkP0ym5xIkwvvylhR7FRJ4RwYcNlK/xwrXQut2zUwh0ohsJo5lI\nvl+tRAwrnhHeJxT0X5z/P7MIHQKBgQDSRCz00x4p6jrNCM4M08yQZ6QeL6ByxN+D\nIB809UBvnBRhX69VHxkopjjlBj1+gPOBnbbSJyDpJq7xogSeSFrc3+qA48J2ecna\nynp0JFfu2UGeheA4pkkWgWhUODhKmPvr5zMb087/Xpey0BhRr0VBCMMfvsxG5uMH\nqk9+gHv41QKBgQCcv+Vd670pkkWa763Coi+5WUbo/tO88qD/w9zSJzRIKQgOL/90\nodGzUgnpt9VHBjzLVVl0fWrMMugq6VC8GMLj3kkuiGaBacShDyDO9MqUiRVDkqQP\nK1IbKh4LQ3NIlVCZuFMpCIY9BiiktQJVuLiL8bDR21mzBg7oYNP4mRhZFQKBgE99\nhqFnztd5vZEV6w/eYk+VXu4qgzXgR7+CvUmADkQjdXD6g4Zio1hCvu+WVFkm1ugB\nf8QjFsYN4cVnwucz42XtIPJpKHMxx6X3NiQCOVwKtkv/wKyp8KeZdJ+iQWWyQEsG\ntMOoZ3ETibYIBamb4UqczWeK8h872khjknn4iOWhAoGBALwSpdS3OFsPS8oD1gHQ\nfbq1ueINZ6I8Y9QpgZHWRI1hBlzk1P4yTYsAzCymmV0cA6UzhHupO4kbV/jwRgis\nIpS4oPeSpA7a9Jg2hSXpxBQqHlHuaUUiCFULaZtCaINcZf3q1ww5jInikS++yEl/\nqLHxYq0LyBhuo95nOARVcmdi\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@duoelo-987fd.iam.gserviceaccount.com",
};

// Inicializa usando o formato modular
initializeApp({
  credential: cert(serviceAccount),
});

// Pega a instância do banco
const db = getFirestore();

// === CONTRATO DE DADOS AJUSTADO PARA O FRONT-END ===
const tasksData = [
  {
    moduleId: 1,
    phase: 1,
    pointsPE: 50,
    riskLevel: "Início Áspero",
    cost: "low",
    title: {
      pt: "Café Atento",
      en: "Mindful Coffee",
      es: "Café Atento",
      fr: "Café Attentif",
      de: "Achtsamer Kaffee",
      ja: "思いやりのコーヒー",
    },
    description: {
      pt: "Faça uma xícara de café/chá para seu parceiro hoje sem avisar.",
      en: "Make a cup of coffee/tea for your partner today unannounced.",
      es: "Prepárale una taza de café/té a tu pareja hoy sin avisar.",
      fr: "Préparez une tasse de café/thé pour votre partenaire aujourd'hui sans prévenir.",
      de: "Machen Sie Ihrem Partner heute unangekündigt eine Tasse Kaffee/Tee.",
      ja: "今日、パートナーに知らせずにコーヒー/お茶を淹れましょう。",
    },
    createdAt: FieldValue.serverTimestamp(),
  },
];

async function seedDatabase() {
  console.log("⏳ Iniciando o seed de tarefas no Firestore...");
  const batch = db.batch();

  tasksData.forEach((task) => {
    const docRef = db.collection("tasks").doc("tarefa_01_cafe_atento");
    batch.set(docRef, task);
  });

  try {
    await batch.commit();
    console.log(
      `✅ Sucesso! ${tasksData.length} tarefas inseridas e prontas para o Algoritmo Sniper.`,
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao popular o banco:", error);
    process.exit(1);
  }
}

seedDatabase();
