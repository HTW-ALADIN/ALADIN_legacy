import aws from "aws-sdk";

interface S3Params {
    Bucket: string;
}

export class S3Client {
    private s3: aws.S3;
    constructor() {
        this.s3 = new aws.S3({
            accessKeyId: process.env.S3_ACCESS_ID,
            secretAccessKey: process.env.S3_SECRET,
            endpoint: process.env.S3_HOST,
            s3ForcePathStyle: true,
            signatureVersion: "v4",
        });
    }

    public async createBucket(params: S3Params) {
        await this.s3.createBucket(params);
    }

    public async deleteBucket(params: S3Params) {
        await this.s3.deleteBucket(params);
    }
}
