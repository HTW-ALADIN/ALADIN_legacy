import * as minio from "minio";
import * as dotenv from "dotenv";
import * as stream from "stream";
dotenv.config({ path: __dirname + "./../../.env" });

const minioClient = () => {
    try {
        return new minio.Client({
            endPoint: "minio",
            port: 9000,
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRED_KEY,
        });
    } catch (error) {
        console.log(error);
    }
};

export class MinioClientWrapper {
    private minioClient: minio.Client = minioClient();

    public async createBucket(name: string) {
        try {
            await this.minioClient.makeBucket(name, "eu");
            return name;
        } catch (error) {
            return error;
        }
    }

    public async getFile(bucket: string, fileName: string) {
        try {
            const stream = await this.minioClient.getObject(bucket, fileName);
            const data: string = await new Promise((resolve, reject) => {
                let dataBuffer = "";
                stream.on("data", (item) => (dataBuffer += item));
                stream.on("error", (error) => reject(error));
                stream.on("end", () => resolve(dataBuffer.toString()));
                stream.on("finish", () => resolve(dataBuffer.toString()));
            });
            return data;
        } catch (error) {
            return error;
        }
    }
    public async uploadObject(bucket: string, fileName: string, file: string | object) {
        let preparedFile = typeof file === "string" ? file : JSON.stringify(file);
        const fileStream = new stream.Readable();
        fileStream.push(preparedFile);
        fileStream.push(null); // needed to simulate EOF
        await this.minioClient.putObject(bucket, fileName, fileStream);
    }
    public async deleteFiles(bucket: string, files: Array<string>) {
        await this.minioClient.removeObjects(bucket, files);
    }
    public async listBuckets() {
        return await this.minioClient.listBuckets();
    }
    public async listFiles(bucket: string, prefix: string = "", recursive: boolean = true): Promise<Array<minio.BucketItem>> {
        const stream = this.minioClient.listObjects(bucket, prefix, recursive);
        const data: Array<minio.BucketItem> = await new Promise((resolve, reject) => {
            const data: Array<any> = [];
            stream.on("data", (item) => data.push(item));
            stream.on("error", (error) => reject(error));
            stream.on("end", () => resolve(data));
            stream.on("finish", () => resolve(data));
        });
        return data;
    }
}

// (async () => {
//     const client = new MinioClientWrapper();
//     const bucket = "erd";
//     const file = await client.getFile(bucket, "northwind.dot");
//     console.log(file);
// })();
