# NESTFiBot on Telegram

## Deploy

1. Copy `.env` to `.env.dev`.
2. Get Bot Token from [@Botfather](https://t.me/botfather)
3. Prepare your aws account.
4. Deploy with `Serverless` command:

    ```shell
    sls deploy -s dev
    ```
    
    or production
    
    ```shell
    sls deploy -s prod
    ```
