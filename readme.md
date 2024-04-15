## It's an order processing application which uses AWS SQS services to handle the orders asynchronously.

##### It has products, users and processes the orders, where a user can registered itself and place an order.

##### A cronjob is running at a specific interval to pull the orders from the queue and process it.

## To run the application locally, follow the following steps:

### Prerequisites

1. **AWS CLI**
   Visit [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) to install AWS CLI.

2. **Setup the AWS profile**
   Run the following command:
   `aws configure`
   <br>

   **Enter the following values on terminal:** -

   - Access key = access_key_value
   - Secret key = secret_key_value
   - Region = aws_region
   ```

   ***

### To run the project locally, follow the following steps:

1. **Install all the node dependencies**
   `npm install`

   ***


2. **For getting the environment variables**
   For getting the environment variable, kindly use the .env.sample file

   ***

4. **Build the application**
   Use this command to build a new clean build once you make changes to the code.
   `npm run build`

   ***

5. **Run the application**
   `npm run dev`

   ***

