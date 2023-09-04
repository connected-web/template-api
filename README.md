# Template API

A template for building highly scalable serverless APIs using AWS Lambda, API Gateway, and Amazon S3.

## Authentication and Authorization

Authentication and Authorization for the API are handled by AWS Cognito; Amazon's robust identity and access management service. During the deployment process, you will need to provide details of an appropriate AWS Cognito user pool or identity pool verifier.

Users interacting with the API are required to send their OAuth token as part of the Authorization header in the format `Bearer {token}`. The OAuth token should be obtained through the user authentication process provided by AWS Cognito.

Please ensure that proper AWS Cognito configurations and security measures are in place to protect your data and control access to the API. Refer to the AWS Cognito documentation for more information on setting up and managing user pools and identity pools.

The API has its own user management system that allows you to track users and add them to data access groups. By default, the API will create a new user group called `admins` and add the first user to this group. The `admins` group has full access to all schemas and data items. You can create additional user groups and add users to these groups to control access to specific schemas and data items.

## Data Storage

The Schema API Database utilizes Amazon S3 (Simple Storage Service) as the primary data storage solution. Data items associated with different schemas are stored as objects within an S3 bucket. This choice of storage provides scalability, durability, and versioning capabilities to maintain a history of file changes.

### Data Storage Format

The data items are stored as JSON objects in an S3 bucket. Each data item is identified by its key path, which includes the associated `schemaId` and `itemId`

```
/users/{principalId}.json       // record of system users 
/userGroups.json                // user groups
```

S3 Bucket versioning is used to track modifications to a file. Each time a data item is updated, a new version of the object is created, preserving the previous version. The versioning feature allows the system to maintain a history of changes made to a data item. Additionally, deleted items are preserved in the bucket as a deleted marker, allowing the system to track the deletion of data items.

### Amazon S3 Bucket Configuration

During the deployment of the Schema API Database, an S3 bucket will be created or specified to store the data items. The bucket should be configured with the appropriate settings to enable versioning. Versioning allows the preservation of all versions of an object in the bucket, enabling the tracking of changes made to individual data items over time.

## Design Considerations

The API Database has been designed to offer the following capabilities:

1. **Throughput**: Users can expect read and write operations with practical throughput for data items stored in AWS S3. The system can handle hundreds to thousands of read and write operations per second, depending on the data item size and complexity.

2. **Latency**: The system delivers responsive read and write latencies, typically ranging from a few milliseconds to tens of milliseconds for S3 operations. API latencies are optimized through efficient Lambda processing and minimal network delays, aiming for response times below 100 milliseconds.

3. **Scalable Item Storage**: Leveraging the power of AWS S3, the Schema API Database supports data items of up to 5TB each. The storage capacity allows for storing millions to tens of millions of data items within a single bucket, depending on the bucket configuration and object sizes.

4. **Concurrent Handling**: The solution considers concurrent user scenarios by scaling AWS Lambda to handle dozens to hundreds of simultaneous executions, and API Gateway throttling is set to accommodate a reasonable number of concurrent users, ensuring reliable performance under various user loads.

Users can expect efficient operations and responsive performance within these ranges.

### Backup and Disaster Recovery

The versioning feature of Amazon S3 provides an inherent backup mechanism, preserving previous versions of data items. Additionally, you can configure cross-region replication to replicate the data to another S3 bucket in a different AWS region, providing an extra layer of protection against data loss due to regional outages or disasters.

Please ensure that you have appropriate data management policies and backup strategies in place to guarantee data integrity and availability. Regularly review your S3 bucket configurations and security settings to meet your specific data storage and compliance requirements.

For further details on Amazon S3 features and best practices, refer to the AWS S3 documentation.

## Contributing

The API Template project is open for contributions. Please refer to the [Contributing Guidelines](CONTRIBUTING.md) for more information.

Happy coding! 🚀

## License Information

This project is licensed under the ISC License. See the [LICENSE](LICENSE.md) file for more information.